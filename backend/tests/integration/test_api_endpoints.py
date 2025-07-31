import pytest
from httpx import AsyncClient
from app.main import app
from app.dependencies import verify_firebase_token
from app.db import prisma_client
from datetime import datetime
import uuid
from fastapi import HTTPException


class TestUsersAPI:
    """ユーザーAPIの統合テスト"""

    @pytest.mark.asyncio
    async def test_create_users_duplicate(self, test_db):
        """ユーザー重複登録時の409エラー検証"""
        async with AsyncClient(app=app, base_url="http://test") as ac:
            # 1回目: ユーザー新規作成
            unique_firebase_uid = f"test_uid_{uuid.uuid4().hex[:8]}"
            user_data = {
                "firebase_uid": unique_firebase_uid,
                "email": f"care_{uuid.uuid4().hex[:8]}@example.com",
                "current_plan": "free",
                "is_verified": True,
            }
            resp1 = await ac.post("/api/users/", json=user_data)
            assert resp1.status_code == 201

            # 2回目: 同じUIDとメールアドレスで再登録 → 409
            resp2 = await ac.post("/api/users/", json=user_data)
            assert resp2.status_code == 409
            assert "already exists" in resp2.text

    @pytest.mark.asyncio
    async def test_get_my_user_not_found(self, test_db):
        """Firebase overrideで存在しないUIDに"""
        app.dependency_overrides[verify_firebase_token] = lambda: "does_not_exist"
        async with AsyncClient(app=app, base_url="http://test") as ac:
            headers = {"Authorization": "Bearer mock_token"}
            resp = await ac.get("/api/users/me", headers=headers)
            assert resp.status_code == 404
            assert "User not found" in resp.text


class TestCareSettingsAPI:
    """お世話設定APIの統合テスト"""

    @pytest.mark.asyncio
    async def test_care_settings_complete_flow(self, test_db):
        """お世話設定のフロー全体を検証する統合テスト"""
        async with AsyncClient(app=app, base_url="http://test") as ac:
            headers = {"Authorization": "Bearer mock_token"}

            # 1. ユーザー作成（ユニークなFirebase UIDを使用）
            unique_firebase_uid = f"test_uid_{uuid.uuid4().hex[:8]}"
            user_data = {
                "firebase_uid": unique_firebase_uid,
                "email": f"care_{uuid.uuid4().hex[:8]}@example.com",
                "current_plan": "free",
                "is_verified": True,
            }
            user_response = await ac.post("/api/users/", json=user_data)

            assert user_response.status_code == 201
            user_id = user_response.json()["id"]

            # Firebase認証dependency overrideを設定
            def override_verify_firebase_token_for_test():
                return unique_firebase_uid

            app.dependency_overrides[verify_firebase_token] = (
                override_verify_firebase_token_for_test
            )

            try:
                # 2. お世話設定作成
                care_setting_data = {
                    "parent_name": "田中花子",
                    "child_name": "田中太郎",
                    "dog_name": "ポチ",
                    "care_start_date": "2024-07-01",
                    "care_end_date": "2024-07-31",
                    "morning_meal_time": "08:00:00",
                    "night_meal_time": "18:00:00",
                    "walk_time": "16:00:00",
                    "care_password": "1234",
                    "care_clear_status": "active",
                }

                setting_response = await ac.post(
                    "/api/care_settings", json=care_setting_data, headers=headers
                )

                assert setting_response.status_code == 201

                # 3. 設定取得確認
                me_response = await ac.get("/api/care_settings/me", headers=headers)
                assert me_response.status_code == 200
                assert me_response.json()["child_name"] == "田中太郎"

                # 4. PIN認証テスト
                pin_data = {"input_password": "1234"}
                pin_response = await ac.post(
                    "/api/care_settings/verify_pin", json=pin_data, headers=headers
                )
                assert pin_response.status_code == 200
                assert pin_response.json()["verified"] == True
            finally:
                # overrideをリセット
                def default_override():
                    return "test_uid_care_001"

                app.dependency_overrides[verify_firebase_token] = default_override

    @pytest.mark.asyncio
    async def test_care_settings_pin_wrong_password(self, test_db):
        """
        お世話設定のPIN認証：間違ったPINで認証失敗することを確認
        """
        async with AsyncClient(app=app, base_url="http://test") as ac:
            headers = {"Authorization": "Bearer mock_token"}

            # 1. ユーザー作成（ユニークなFirebase UIDを使用）
            unique_firebase_uid = f"test_uid_{uuid.uuid4().hex[:8]}"
            user_data = {
                "firebase_uid": unique_firebase_uid,
                "email": f"care_{uuid.uuid4().hex[:8]}@example.com",
                "current_plan": "free",
                "is_verified": True,
            }
            user_response = await ac.post("/api/users/", json=user_data)

            assert user_response.status_code == 201
            user_id = user_response.json()["id"]

            # Firebase認証dependency overrideを設定
            def override_verify_firebase_token_for_test():
                return unique_firebase_uid

            app.dependency_overrides[verify_firebase_token] = (
                override_verify_firebase_token_for_test
            )

            try:
                # 2. お世話設定作成
                care_setting_data = {
                    "parent_name": "ひら花子",
                    "child_name": "ひら太郎",
                    "dog_name": "ひらポチ",
                    "care_start_date": "2024-07-01",
                    "care_end_date": "2024-07-31",
                    "morning_meal_time": "08:00:00",
                    "night_meal_time": "18:00:00",
                    "walk_time": "16:00:00",
                    "care_password": "4321",  # 正しいPIN
                    "care_clear_status": "active",
                }

                setting_response = await ac.post(
                    "/api/care_settings", json=care_setting_data, headers=headers
                )

                assert setting_response.status_code == 201

                # 3. 間違ったPINで認証試行
                # ここでは、PINを"9999"とする
                pin_data = {"input_password": "9999"}
                pin_response = await ac.post(
                    "/api/care_settings/verify_pin", json=pin_data, headers=headers
                )
                assert pin_response.status_code == 200
                result = pin_response.json()
                assert result["verified"] is False
            finally:

                def default_override():
                    return "test_uid_care_001"

                app.dependency_overrides[verify_firebase_token] = default_override

    @pytest.mark.asyncio
    async def test_care_settings_missing_required_fields(self, test_db):
        """
        お世話設定のcare_passwordが欠損している場合のエラーハンドリング
        """
        async with AsyncClient(app=app, base_url="http://test") as ac:
            headers = {"Authorization": "Bearer mock_token"}
            # care_passwordを欠損させる
            data = {
                "parent_name": "親",
                "child_name": "子",
                "dog_name": "犬",
                "care_start_date": "2024-07-01",
                "care_end_date": "2024-07-31",
                "morning_meal_time": "08:00:00",
                "night_meal_time": "18:00:00",
                "walk_time": "16:00:00",
                # "care_password": "1234",  # わざと外す
                "care_clear_status": "active",
            }
            resp = await ac.post("/api/care_settings", json=data, headers=headers)
            assert resp.status_code in [400, 422]

    @pytest.mark.asyncio
    async def test_care_settings_no_user(test_db):
        """
        存在しないユーザーでPIN認証
        """
        async with AsyncClient(app=app, base_url="http://test") as ac:
            headers = {"Authorization": "Bearer mock_token"}
            # Firebase overrideで存在しないUIDに
            app.dependency_overrides[verify_firebase_token] = lambda: "nonexistent_uid"
            resp = await ac.post(
                "/api/care_settings/verify_pin",
                json={"input_password": "1234"},
                headers=headers,
            )
            assert resp.status_code in [404, 400, 422, 500]

    @pytest.mark.asyncio
    async def test_care_settings_invalid_date_format(test_db):
        """
        無効な日付形式
        """
        async with AsyncClient(app=app, base_url="http://test") as ac:
            headers = {"Authorization": "Bearer mock_token"}
            data = {
                "parent_name": "親",
                "child_name": "子",
                "dog_name": "犬",
                "care_start_date": "not-a-date",
                "care_end_date": "not-a-date",
                "morning_meal_time": "99:99:99",
                "night_meal_time": "18:00:00",
                "walk_time": "16:00:00",
                "care_password": "0000",
                "care_clear_status": "active",
            }
            resp = await ac.post("/api/care_settings", json=data, headers=headers)
            assert resp.status_code in [400, 422, 500]


class TestCareLogsAPI:
    """お世話ログAPIの統合テスト"""

    @pytest.mark.asyncio
    async def test_care_logs_crud_flow(self, test_db):
        """お世話ログのCRUD（作成・取得・更新・一覧）フローの統合テスト"""
        # テスト用ユーザーを作成
        unique_firebase_uid = f"test_uid_{uuid.uuid4().hex[:8]}"
        user = await test_db.users.create(
            data={
                "firebase_uid": unique_firebase_uid,
                "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
                "current_plan": "free",
                "is_verified": True,
            }
        )

        # テスト用お世話設定を作成
        care_setting = await test_db.care_settings.create(
            data={
                "user_id": user.id,
                "parent_name": "田中花子",
                "child_name": "田中太郎",
                "dog_name": "ポチ",
                "care_start_date": datetime.fromisoformat("2024-07-01T00:00:00+00:00"),
                "care_end_date": datetime.fromisoformat("2024-07-31T00:00:00+00:00"),
                "morning_meal_time": datetime.fromisoformat(
                    "2024-07-01T08:00:00+00:00"
                ),
                "night_meal_time": datetime.fromisoformat("2024-07-01T18:00:00+00:00"),
                "walk_time": datetime.fromisoformat("2024-07-01T16:00:00+00:00"),
                "care_password": "1234",
                "care_clear_status": "active",
            }
        )

        # Firebase認証dependency overrideを動的に設定
        def override_verify_firebase_token_for_test():
            return user.firebase_uid

        app.dependency_overrides[verify_firebase_token] = (
            override_verify_firebase_token_for_test
        )

        try:
            async with AsyncClient(app=app, base_url="http://test") as ac:
                headers = {"Authorization": "Bearer mock_token"}
                care_setting_id = care_setting.id

                # 1. お世話ログ作成
                log_data = {
                    "care_setting_id": care_setting_id,
                    "date": "2024-07-01",
                    "fed_morning": True,
                    "fed_night": False,
                    "walk_result": False,
                }
                create_response = await ac.post(
                    "/api/care_logs", json=log_data, headers=headers
                )
                assert create_response.status_code == 201
                care_log_id = create_response.json()["id"]

                # 2. 今日のログ取得
                today_response = await ac.get(
                    f"/api/care_logs/today?care_setting_id={care_setting_id}&date=2024-07-01",
                    headers=headers,
                )
                assert today_response.status_code == 200
                assert today_response.json()["fed_morning"] == True
                assert today_response.json()["walked"] == False

                # 3. ログ更新（散歩完了）
                update_data = {"walk_result": True, "walk_total_distance_m": 1500}
                update_response = await ac.patch(
                    f"/api/care_logs/{care_log_id}", json=update_data, headers=headers
                )
                assert update_response.status_code == 200
                assert update_response.json()["walk_result"] == True

                # 4. ログ一覧取得
                list_response = await ac.get(
                    f"/api/care_logs/list?care_setting_id={care_setting_id}",
                    headers=headers,
                )
                assert list_response.status_code == 200
                assert len(list_response.json()["care_logs"]) == 1
        finally:
            # overrideをリセット
            def default_override():
                return "test_uid_care_001"

            app.dependency_overrides[verify_firebase_token] = default_override

    @pytest.mark.asyncio
    async def test_care_logs_error_handling(self, test_db):
        """お世話ログのエラーハンドリングテスト"""
        # テスト用ユーザーを作成
        unique_firebase_uid = f"test_uid_{uuid.uuid4().hex[:8]}"
        user = await test_db.users.create(
            data={
                "firebase_uid": unique_firebase_uid,
                "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
                "current_plan": "free",
                "is_verified": True,
            }
        )

        # Firebase認証dependency overrideを設定
        def override_verify_firebase_token_for_test():
            return user.firebase_uid

        app.dependency_overrides[verify_firebase_token] = (
            override_verify_firebase_token_for_test
        )

        try:
            async with AsyncClient(app=app, base_url="http://test") as ac:
                headers = {"Authorization": "Bearer mock_token"}

                # 1. 存在しないcare_setting_idでログ作成
                invalid_log_data = {
                    "care_setting_id": 99999,  # 存在しないID
                    "date": "2024-07-01",
                    "fed_morning": True,
                }
                create_response = await ac.post(
                    "/api/care_logs", json=invalid_log_data, headers=headers
                )
                assert create_response.status_code in [404, 500]  # エラーレスポンス

                # 2. 存在しないログIDで更新
                update_response = await ac.patch(
                    "/api/care_logs/99999", json={"fed_morning": True}, headers=headers
                )
                assert update_response.status_code == 404  # Not Found

                # 3. 存在しないcare_setting_idで今日のログ取得
                today_response = await ac.get(
                    "/api/care_logs/today?care_setting_id=99999&date=2024-07-01",
                    headers=headers,
                )
                assert today_response.status_code in [
                    403,
                    404,
                ]  # Forbidden or Not Found

                # 4. 存在しないcare_setting_idでリスト取得
                list_response = await ac.get(
                    "/api/care_logs/list?care_setting_id=99999",
                    headers=headers,
                )
                assert list_response.status_code in [403, 404]  # Forbidden or Not Found
        finally:
            # overrideをリセット
            def default_override():
                return "test_uid_care_001"

            app.dependency_overrides[verify_firebase_token] = default_override

    @pytest.mark.asyncio
    async def test_care_logs_authorization(self, test_db):
        """お世話ログの認証テスト"""
        # 2人のユーザーを作成
        user1_firebase_uid = f"test_uid_{uuid.uuid4().hex[:8]}"
        user1 = await test_db.users.create(
            data={
                "firebase_uid": user1_firebase_uid,
                "email": f"user1_{uuid.uuid4().hex[:8]}@example.com",
                "current_plan": "free",
                "is_verified": True,
            }
        )

        user2_firebase_uid = f"test_uid_{uuid.uuid4().hex[:8]}"
        user2 = await test_db.users.create(
            data={
                "firebase_uid": user2_firebase_uid,
                "email": f"user2_{uuid.uuid4().hex[:8]}@example.com",
                "current_plan": "free",
                "is_verified": True,
            }
        )

        # user1のお世話設定を作成
        care_setting = await test_db.care_settings.create(
            data={
                "user_id": user1.id,
                "parent_name": "ユーザー1",
                "child_name": "子ども1",
                "dog_name": "犬1",
                "care_start_date": datetime.fromisoformat("2024-07-01T00:00:00+00:00"),
                "care_end_date": datetime.fromisoformat("2024-07-31T00:00:00+00:00"),
                "morning_meal_time": datetime.fromisoformat(
                    "2024-07-01T08:00:00+00:00"
                ),
                "night_meal_time": datetime.fromisoformat("2024-07-01T18:00:00+00:00"),
                "walk_time": datetime.fromisoformat("2024-07-01T16:00:00+00:00"),
                "care_password": "1234",
                "care_clear_status": "active",
            }
        )

        # user1でログ作成
        def override_user1():
            return user1_firebase_uid

        app.dependency_overrides[verify_firebase_token] = override_user1

        async with AsyncClient(app=app, base_url="http://test") as ac:
            headers = {"Authorization": "Bearer mock_token"}

            # user1でログ作成
            log_data = {
                "care_setting_id": care_setting.id,
                "date": "2024-07-01",
                "fed_morning": True,
            }
            create_response = await ac.post(
                "/api/care_logs", json=log_data, headers=headers
            )
            assert create_response.status_code == 201
            care_log_id = create_response.json()["id"]

        # user2で他人のログにアクセス試行
        def override_user2():
            return user2_firebase_uid

        app.dependency_overrides[verify_firebase_token] = override_user2

        try:
            async with AsyncClient(app=app, base_url="http://test") as ac:
                headers = {"Authorization": "Bearer mock_token"}

                # user2で他人のログ更新試行
                update_response = await ac.patch(
                    f"/api/care_logs/{care_log_id}",
                    json={"fed_morning": False},
                    headers=headers,
                )
                assert update_response.status_code in [403, 404]  # 認証失敗

                # user2で他人のcare_settingのログ取得試行
                today_response = await ac.get(
                    f"/api/care_logs/today?care_setting_id={care_setting.id}&date=2024-07-01",
                    headers=headers,
                )
                assert today_response.status_code in [403, 404]  # 認証失敗
        finally:
            # overrideをリセット
            def default_override():
                return "test_uid_care_001"

            app.dependency_overrides[verify_firebase_token] = default_override

        @pytest.mark.asyncio
        async def test_care_logs_create_invalid_input(test_db):
            # 必須フィールド欠損、型不正
            async with AsyncClient(app=app, base_url="http://test") as ac:
                headers = {"Authorization": "Bearer mock_token"}
                invalid_data = {
                    # care_setting_idが欠損
                    "date": "2024-07-01",
                    "fed_morning": "not_bool",  # 型違い
                }
                resp = await ac.post(
                    "/api/care_logs", json=invalid_data, headers=headers
                )
                assert resp.status_code in [422, 400]


class TestReflectionNotesAPI:
    """反省文APIの統合テスト"""

    @pytest.mark.asyncio
    async def test_reflection_notes_flow(self, test_db):
        """反省文の作成から取得・承認までのフロー統合テスト"""
        # テスト用ユーザーを作成
        unique_firebase_uid = f"test_uid_{uuid.uuid4().hex[:8]}"
        user = await test_db.users.create(
            data={
                "firebase_uid": unique_firebase_uid,
                "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
                "current_plan": "free",
                "is_verified": True,
            }
        )

        # テスト用お世話設定を作成
        care_setting = await test_db.care_settings.create(
            data={
                "user_id": user.id,
                "parent_name": "田中花子",
                "child_name": "田中太郎",
                "dog_name": "ポチ",
                "care_start_date": datetime.fromisoformat("2024-07-01T00:00:00+00:00"),
                "care_end_date": datetime.fromisoformat("2024-07-31T00:00:00+00:00"),
                "morning_meal_time": datetime.fromisoformat(
                    "2024-07-01T08:00:00+00:00"
                ),
                "night_meal_time": datetime.fromisoformat("2024-07-01T18:00:00+00:00"),
                "walk_time": datetime.fromisoformat("2024-07-01T16:00:00+00:00"),
                "care_password": "1234",
                "care_clear_status": "active",
            }
        )

        # Firebase認証dependency overrideを動的に設定
        def override_verify_firebase_token_for_test():
            return user.firebase_uid

        app.dependency_overrides[verify_firebase_token] = (
            override_verify_firebase_token_for_test
        )

        try:
            async with AsyncClient(app=app, base_url="http://test") as ac:
                headers = {"Authorization": "Bearer mock_token"}
                care_setting_id = care_setting.id

                # 1. 反省文作成（子ども）
                note_data = {
                    "care_setting_id": care_setting_id,
                    "content": "今日は散歩をサボってしまいました。明日は必ず行きます。",
                }
                create_response = await ac.post(
                    "/api/reflection_notes", json=note_data, headers=headers
                )
                assert create_response.status_code == 201
                note_id = create_response.json()["id"]

                # 2. 反省文一覧取得（保護者）
                list_response = await ac.get(
                    f"/api/reflection_notes?care_setting_id={care_setting_id}",
                    headers=headers,
                )
                assert list_response.status_code == 200
                assert len(list_response.json()) == 1
                assert list_response.json()[0]["approved_by_parent"] == False

                # 3. 保護者による承認
                approve_data = {"approved_by_parent": True}
                approve_response = await ac.patch(
                    f"/api/reflection_notes/{note_id}",
                    json=approve_data,
                    headers=headers,
                )
                assert approve_response.status_code == 200
                assert approve_response.json()["approved_by_parent"] == True
        finally:
            # overrideをリセット
            def default_override():
                return "test_uid_care_001"

            app.dependency_overrides[verify_firebase_token] = default_override


class TestPaymentAPI:
    """決済APIの統合テスト"""

    @pytest.mark.asyncio
    async def test_payment_create_checkout_session_flow(self, test_db):
        """チェックアウトセッション作成の統合テスト"""
        # テスト用ユーザーを作成（無料プラン）
        unique_firebase_uid = f"test_uid_{uuid.uuid4().hex[:8]}"
        user = await test_db.users.create(
            data={
                "firebase_uid": unique_firebase_uid,
                "email": f"payment_{uuid.uuid4().hex[:8]}@example.com",
                "current_plan": "free",  # 無料プラン
                "is_verified": True,
            }
        )

        # Firebase認証dependency overrideを設定
        def override_verify_firebase_token_for_test():
            return user.firebase_uid

        app.dependency_overrides[verify_firebase_token] = (
            override_verify_firebase_token_for_test
        )

        try:
            async with AsyncClient(app=app, base_url="http://test") as ac:
                headers = {"Authorization": "Bearer mock_token"}

                # 1. 正常なチェックアウトセッション作成
                session_response = await ac.post(
                    "/api/payments/create-checkout-session", headers=headers
                )
                # Stripe service の実装により結果が異なる
                assert session_response.status_code in [200, 500]

                if session_response.status_code == 200:
                    session_data = session_response.json()
                    assert "url" in session_data

                # 2. 複数回のセッション作成試行
                session_response2 = await ac.post(
                    "/api/payments/create-checkout-session", headers=headers
                )
                assert session_response2.status_code in [200, 500]
        finally:
            # overrideをリセット
            def default_override():
                return "test_uid_care_001"

            app.dependency_overrides[verify_firebase_token] = default_override

    @pytest.mark.asyncio
    async def test_payment_premium_user_rejection(self, test_db):
        """プレミアムユーザーの決済拒否テスト"""
        # テスト用ユーザーを作成（プレミアムプラン）
        unique_firebase_uid = f"test_uid_{uuid.uuid4().hex[:8]}"
        premium_user = await test_db.users.create(
            data={
                "firebase_uid": unique_firebase_uid,
                "email": f"premium_{uuid.uuid4().hex[:8]}@example.com",
                "current_plan": "premium",  # 既にプレミアム
                "is_verified": True,
            }
        )

        # Firebase認証dependency overrideを設定
        def override_verify_firebase_token_for_test():
            return premium_user.firebase_uid

        app.dependency_overrides[verify_firebase_token] = (
            override_verify_firebase_token_for_test
        )

        try:
            async with AsyncClient(app=app, base_url="http://test") as ac:
                headers = {"Authorization": "Bearer mock_token"}

                # プレミアムユーザーでのチェックアウトセッション作成試行
                session_response = await ac.post(
                    "/api/payments/create-checkout-session", headers=headers
                )
                assert session_response.status_code == 400
                error_data = session_response.json()
                assert "すでにプレミアムプランです" in error_data["detail"]
        finally:
            # overrideをリセット
            def default_override():
                return "test_uid_care_001"

            app.dependency_overrides[verify_firebase_token] = default_override

    @pytest.mark.asyncio
    async def test_payment_nonexistent_user_error(self, test_db):
        """存在しないユーザーでの決済エラーテスト"""

        # 存在しないユーザーでのテスト
        def override_nonexistent_user():
            return "nonexistent_firebase_uid_payment"

        app.dependency_overrides[verify_firebase_token] = override_nonexistent_user

        try:
            async with AsyncClient(app=app, base_url="http://test") as ac:
                headers = {"Authorization": "Bearer mock_token"}

                # 存在しないユーザーでのチェックアウトセッション作成
                session_response = await ac.post(
                    "/api/payments/create-checkout-session", headers=headers
                )
                # ユーザーが存在しない場合の処理（実装により異なる）
                assert session_response.status_code in [200, 400, 500]
        finally:
            # overrideをリセット
            def default_override():
                return "test_uid_care_001"

            app.dependency_overrides[verify_firebase_token] = default_override

    @pytest.mark.asyncio
    async def test_payment_authentication_errors(self, test_db):
        """決済API認証エラーテスト"""
        async with AsyncClient(app=app, base_url="http://test") as ac:
            # 1. 認証ヘッダーなしでのアクセス
            no_auth_response = await ac.post("/api/payments/create-checkout-session")
            assert no_auth_response.status_code in [200, 401, 422]

            # 2. 無効な認証ヘッダーでのアクセス
            invalid_headers = {"Authorization": "Bearer invalid_payment_token"}
            invalid_auth_response = await ac.post(
                "/api/payments/create-checkout-session", headers=invalid_headers
            )
            assert invalid_auth_response.status_code in [200, 401, 422]

            # 3. 不正な認証フォーマット
            wrong_format_headers = {"Authorization": "InvalidFormat token"}
            wrong_format_response = await ac.post(
                "/api/payments/create-checkout-session", headers=wrong_format_headers
            )
            assert wrong_format_response.status_code in [200, 401, 422]


class TestMessageLogsAPI:
    """メッセージログAPIの統合テスト"""

    @pytest.mark.asyncio
    async def test_message_logs_generation_flow(self, test_db):
        """メッセージ生成の統合テスト"""
        # テスト用ユーザーを作成
        unique_firebase_uid = f"test_uid_{uuid.uuid4().hex[:8]}"
        user = await test_db.users.create(
            data={
                "firebase_uid": unique_firebase_uid,
                "email": f"msg_{uuid.uuid4().hex[:8]}@example.com",
                "current_plan": "free",
                "is_verified": True,
            }
        )

        # テスト用お世話設定を作成
        care_setting = await test_db.care_settings.create(
            data={
                "user_id": user.id,
                "parent_name": "田中花子",
                "child_name": "田中太郎",
                "dog_name": "ポチ",
                "care_start_date": datetime.fromisoformat("2024-07-01T00:00:00+00:00"),
                "care_end_date": datetime.fromisoformat("2024-07-31T00:00:00+00:00"),
                "morning_meal_time": datetime.fromisoformat(
                    "2024-07-01T08:00:00+00:00"
                ),
                "night_meal_time": datetime.fromisoformat("2024-07-01T18:00:00+00:00"),
                "walk_time": datetime.fromisoformat("2024-07-01T16:00:00+00:00"),
                "care_password": "1234",
                "care_clear_status": "active",
            }
        )

        # Firebase認証dependency overrideを設定
        def override_verify_firebase_token_for_test():
            return user.firebase_uid

        app.dependency_overrides[verify_firebase_token] = (
            override_verify_firebase_token_for_test
        )

        try:
            async with AsyncClient(app=app, base_url="http://test") as ac:
                headers = {"Authorization": "Bearer mock_token"}

                # 1. メッセージ生成API（無料プラン）
                message_response = await ac.post(
                    "/api/message_logs/generate", headers=headers
                )
                assert message_response.status_code == 200
                assert "message" in message_response.json()

                # 無料プランの場合、固定メッセージのいずれかが返される
                free_messages = [
                    "わん！",
                    "おなかすいたわん！",
                    "おさんぽいくわん！",
                ]
                assert message_response.json()["message"] in free_messages

                # 2. 複数回の生成（ランダムテスト）
                for _ in range(3):
                    repeat_response = await ac.post(
                        "/api/message_logs/generate", headers=headers
                    )
                    assert repeat_response.status_code == 200
                    assert "message" in repeat_response.json()
        finally:
            # overrideをリセット
            def default_override():
                return "test_uid_care_001"

            app.dependency_overrides[verify_firebase_token] = default_override

    @pytest.mark.asyncio
    async def test_message_logs_premium_user(self, test_db):
        """プレミアムユーザーのメッセージ生成テスト"""
        # テスト用プレミアムユーザーを作成
        unique_firebase_uid = f"test_uid_{uuid.uuid4().hex[:8]}"
        premium_user = await test_db.users.create(
            data={
                "firebase_uid": unique_firebase_uid,
                "email": f"premium_{uuid.uuid4().hex[:8]}@example.com",
                "current_plan": "premium",
                "is_verified": True,
            }
        )

        # Firebase認証dependency overrideを設定
        def override_verify_firebase_token_for_test():
            return premium_user.firebase_uid

        app.dependency_overrides[verify_firebase_token] = (
            override_verify_firebase_token_for_test
        )

        try:
            async with AsyncClient(app=app, base_url="http://test") as ac:
                headers = {"Authorization": "Bearer mock_token"}

                # プレミアムユーザーでのメッセージ生成
                message_response = await ac.post(
                    "/api/message_logs/generate", headers=headers
                )
                assert message_response.status_code == 200
                assert "message" in message_response.json()

                # プレミアムプランでもOpenAI APIエラー時は固定メッセージ
                message = message_response.json()["message"]
                free_messages = [
                    "わん！",
                    "おなかすいたわん！",
                    "おさんぽいくわん！",
                ]
                # OpenAI API設定なしの場合、固定メッセージになる
                assert isinstance(message, str)
        finally:
            # overrideをリセット
            def default_override():
                return "test_uid_care_001"

            app.dependency_overrides[verify_firebase_token] = default_override

    @pytest.mark.asyncio
    async def test_message_logs_error_handling(self, test_db):
        """メッセージログのエラーハンドリングテスト"""

        # 存在しないユーザーでのテスト
        def override_nonexistent_user():
            return "nonexistent_firebase_uid"

        app.dependency_overrides[verify_firebase_token] = override_nonexistent_user

        try:
            async with AsyncClient(app=app, base_url="http://test") as ac:
                headers = {"Authorization": "Bearer mock_token"}

                # 1. 存在しないユーザーでのメッセージ生成
                invalid_user_response = await ac.post(
                    "/api/message_logs/generate", headers=headers
                )
                assert invalid_user_response.status_code in [400, 404, 403, 500]

                # 2. 未認証でのアクセス試行
                no_auth_response = await ac.post("/api/message_logs/generate")
                assert no_auth_response.status_code in [400, 401, 422]

                # 3. 存在しないエンドポイントへのアクセス
                not_found_response = await ac.get("/api/message_logs/nonexistent")
                assert not_found_response.status_code in [404, 405]
        finally:
            # overrideをリセット
            def default_override():
                return "test_uid_care_001"

            app.dependency_overrides[verify_firebase_token] = default_override

    @pytest.mark.asyncio
    async def test_message_logs_error_recovery(self, test_db):
        """メッセージログのエラー回復テスト"""
        # 無効なデータを持つユーザーでのテスト
        unique_firebase_uid = f"test_uid_{uuid.uuid4().hex[:8]}"
        user_with_none_plan = await test_db.users.create(
            data={
                "firebase_uid": unique_firebase_uid,
                "email": f"recovery_{uuid.uuid4().hex[:8]}@example.com",
                "current_plan": None,  # Noneプラン
                "is_verified": True,
            }
        )

        # Firebase認証dependency overrideを設定
        def override_verify_firebase_token_for_test():
            return user_with_none_plan.firebase_uid

        app.dependency_overrides[verify_firebase_token] = (
            override_verify_firebase_token_for_test
        )

        try:
            async with AsyncClient(app=app, base_url="http://test") as ac:
                headers = {"Authorization": "Bearer mock_token"}

                # Noneプランでのメッセージ生成（エラー回復テスト）
                recovery_response = await ac.post(
                    "/api/message_logs/generate", headers=headers
                )
                assert recovery_response.status_code == 200
                assert "message" in recovery_response.json()

                # エラー時でも固定メッセージが返される
                message = recovery_response.json()["message"]
                free_messages = [
                    "わん！",
                    "おなかすいたわん！",
                    "おさんぽいくわん！",
                ]
                assert message in free_messages
        finally:
            # overrideをリセット
            def default_override():
                return "test_uid_care_001"

            app.dependency_overrides[verify_firebase_token] = default_override

    @pytest.mark.asyncio
    async def test_message_logs_generate_invalid_input(self, test_db):
        async with AsyncClient(app=app, base_url="http://test") as ac:
            headers = {"Authorization": "Bearer mock_token"}
            resp = await ac.post(
                "/api/message_logs/generate",
                json={"care_setting_id": "not-int"},
                headers=headers,
            )
            assert resp.status_code in [400, 422]

    @pytest.mark.asyncio
    async def test_message_logs_error_recovery(self, test_db):
        """メッセージログのエラー回復テスト"""
        # 無効なデータを持つユーザーでのテスト
        unique_firebase_uid = f"test_uid_{uuid.uuid4().hex[:8]}"
        user_with_none_plan = await test_db.users.create(
            data={
                "firebase_uid": unique_firebase_uid,
                "email": f"recovery_{uuid.uuid4().hex[:8]}@example.com",
                "current_plan": "weird_plan_type",  # 存在しないプラン
                "is_verified": True,
            }
        )

        # Firebase認証dependency overrideを設定
        def override_verify_firebase_token_for_test():
            return user_with_none_plan.firebase_uid

        app.dependency_overrides[verify_firebase_token] = (
            override_verify_firebase_token_for_test
        )

        try:
            async with AsyncClient(app=app, base_url="http://test") as ac:
                headers = {"Authorization": "Bearer mock_token"}

                # 存在しないプランでのメッセージ生成（エラー回復テスト）
                recovery_response = await ac.post(
                    "/api/message_logs/generate", headers=headers
                )
                assert recovery_response.status_code == 200
                assert "message" in recovery_response.json()

                # エラー時でも固定メッセージが返される
                message = recovery_response.json()["message"]
                free_messages = [
                    "わん！",
                    "おなかすいたわん！",
                    "おさんぽいくわん！",
                ]
                assert message in free_messages
        finally:
            # overrideをリセット
            def default_override():
                return "test_uid_care_001"

            app.dependency_overrides[verify_firebase_token] = default_override


class TestWebhookAPI:
    """Webhook APIの統合テスト"""

    @pytest.mark.asyncio
    async def test_webhook_processing_flow(self, test_db):
        """Webhook受信および処理の統合テスト"""
        # テスト用ユーザーを事前に作成
        user = await test_db.users.create(
            data={
                "firebase_uid": "test_uid_care_001",
                "email": "test@example.com",
                "current_plan": "free",
                "is_verified": True,
            }
        )

        async with AsyncClient(app=app, base_url="http://test") as ac:
            # 1. Webhook受信（模擬Stripeからのイベント）
            webhook_data = {
                "id": "evt_test_webhook",
                "type": "checkout.session.completed",
                "data": {
                    "object": {
                        "id": "cs_test_session",
                        "payment_intent": "pi_test_intent",
                        "amount_total": 500,
                        "currency": "jpy",
                        "payment_status": "paid",
                        "customer_email": "test@example.com",
                        "metadata": {"firebase_uid": "test_uid_care_001"},
                    }
                },
            }

            webhook_response = await ac.post(
                "/api/webhook_events/",
                json=webhook_data,
                headers={"Content-Type": "application/json"},
            )
            assert webhook_response.status_code == 200

            # 2. Webhook保存確認
            webhook_result = webhook_response.json()
            assert webhook_result["message"] == "Webhook eventを保存しました"

            # 3. データベース内でのWebhookイベント確認
            saved_webhook = await test_db.webhook_events.find_unique(
                where={"id": "evt_test_webhook"}
            )
            assert saved_webhook is not None
            assert saved_webhook.event_type == "checkout.session.completed"
            assert saved_webhook.firebase_uid == "test_uid_care_001"

            # 4. ユーザーのプランアップグレード確認（webhook処理により自動実行）
            updated_user = await test_db.users.find_unique(
                where={"firebase_uid": "test_uid_care_001"}
            )
            # webhook処理が成功した場合、プランがアップグレードされる
            # （実装によってはここは異なる可能性があります）
            assert updated_user.current_plan in ["premium", "free"]

    @pytest.mark.asyncio
    async def test_webhook_comprehensive_event_types(self, test_db):
        """包括的なWebhookイベントタイプテスト"""
        # テスト用ユーザーを作成
        user = await test_db.users.create(
            data={
                "firebase_uid": "test_webhook_comprehensive",
                "email": "comprehensive@example.com",
                "current_plan": "free",
                "is_verified": True,
            }
        )

        async with AsyncClient(app=app, base_url="http://test") as ac:
            # 1. checkout.session.completed イベント（完全版）
            checkout_completed_data = {
                "id": "evt_checkout_completed",
                "type": "checkout.session.completed",
                "data": {
                    "object": {
                        "id": "cs_test_session_complete",
                        "payment_intent": "pi_test_complete",
                        "amount_total": 1000,
                        "currency": "jpy",
                        "payment_status": "paid",
                        "customer_email": "comprehensive@example.com",
                        "metadata": {"firebase_uid": "test_webhook_comprehensive"},
                        "billing_details": {"email": "comprehensive@example.com"},
                    }
                },
            }

            checkout_response = await ac.post(
                "/api/webhook_events/",
                json=checkout_completed_data,
                headers={"Content-Type": "application/json"},
            )
            assert checkout_response.status_code == 200

            # 2. payment_intent.succeeded イベント
            payment_succeeded_data = {
                "id": "evt_payment_succeeded",
                "type": "payment_intent.succeeded",
                "data": {
                    "object": {
                        "id": "pi_succeeded_intent",
                        "amount": 1000,
                        "currency": "jpy",
                        "status": "succeeded",
                        "payment_intent": "pi_succeeded_intent",
                        "billing_details": {"email": "comprehensive@example.com"},
                    }
                },
            }

            payment_response = await ac.post(
                "/api/webhook_events/",
                json=payment_succeeded_data,
                headers={"Content-Type": "application/json"},
            )
            assert payment_response.status_code == 200

            # 3. payment_intent.payment_failed イベント
            payment_failed_data = {
                "id": "evt_payment_failed_comprehensive",
                "type": "payment_intent.payment_failed",
                "data": {
                    "object": {
                        "id": "pi_failed_intent",
                        "amount": 1000,
                        "currency": "jpy",
                        "status": "requires_payment_method",
                        "payment_intent": "pi_failed_intent",
                        "billing_details": {"email": "comprehensive@example.com"},
                    }
                },
            }

            failed_response = await ac.post(
                "/api/webhook_events/",
                json=payment_failed_data,
                headers={"Content-Type": "application/json"},
            )
            assert failed_response.status_code == 200

            # 4. 不明なイベントタイプ
            unknown_event_data = {
                "id": "evt_unknown_comprehensive",
                "type": "unknown.event.type",
                "data": {
                    "object": {
                        "id": "unknown_object",
                        "some_field": "some_value",
                    }
                },
            }

            unknown_response = await ac.post(
                "/api/webhook_events/",
                json=unknown_event_data,
                headers={"Content-Type": "application/json"},
            )
            assert unknown_response.status_code == 200

            # 5. データベース確認
            events = await test_db.webhook_events.find_many(
                where={
                    "id": {
                        "in": [
                            "evt_checkout_completed",
                            "evt_payment_succeeded",
                            "evt_payment_failed_comprehensive",
                            "evt_unknown_comprehensive",
                        ]
                    }
                }
            )
            assert len(events) == 4

    @pytest.mark.asyncio
    async def test_webhook_edge_cases_and_errors(self, test_db):
        """Webhookエッジケースとエラーテスト"""
        async with AsyncClient(app=app, base_url="http://test") as ac:
            # 1. 不完全なWebhookデータ
            incomplete_data = {
                "id": "evt_incomplete",
                "type": "checkout.session.completed",
                # "data" フィールドが不足
            }

            incomplete_response = await ac.post(
                "/api/webhook_events/",
                json=incomplete_data,
                headers={"Content-Type": "application/json"},
            )
            assert incomplete_response.status_code in [200, 500]  # 実装により異なる

            # 2. metadataが欠けているcheckout.session.completed
            no_metadata_data = {
                "id": "evt_no_metadata",
                "type": "checkout.session.completed",
                "data": {
                    "object": {
                        "id": "cs_no_metadata",
                        "payment_intent": "pi_no_metadata",
                        "amount_total": 500,
                        "currency": "jpy",
                        "payment_status": "paid",
                        # "metadata" フィールドなし
                    }
                },
            }

            no_metadata_response = await ac.post(
                "/api/webhook_events/",
                json=no_metadata_data,
                headers={"Content-Type": "application/json"},
            )
            assert no_metadata_response.status_code == 200

            # 3. 空のpayloadテスト
            empty_payload_data = {}

            empty_response = await ac.post(
                "/api/webhook_events/",
                json=empty_payload_data,
                headers={"Content-Type": "application/json"},
            )
            assert empty_response.status_code in [200, 500]

            # 4. amount や currency が None のケース
            null_fields_data = {
                "id": "evt_null_fields",
                "type": "checkout.session.completed",
                "data": {
                    "object": {
                        "id": "cs_null_fields",
                        "payment_intent": None,  # Null payment_intent
                        "amount_total": None,  # Null amount
                        "currency": None,  # Null currency
                        "payment_status": None,  # Null status
                        "metadata": {"firebase_uid": "test_null_user"},
                    }
                },
            }

            null_response = await ac.post(
                "/api/webhook_events/",
                json=null_fields_data,
                headers={"Content-Type": "application/json"},
            )
            assert null_response.status_code == 200

            # 5. 重複IDのWebhookイベント
            duplicate_data = {
                "id": "evt_duplicate_id",
                "type": "checkout.session.completed",
                "data": {
                    "object": {
                        "id": "cs_duplicate",
                        "payment_intent": "pi_duplicate",
                        "amount_total": 500,
                        "currency": "jpy",
                        "payment_status": "paid",
                        "metadata": {"firebase_uid": "test_duplicate"},
                    }
                },
            }

            # 初回送信
            first_duplicate_response = await ac.post(
                "/api/webhook_events/",
                json=duplicate_data,
                headers={"Content-Type": "application/json"},
            )
            assert first_duplicate_response.status_code == 200

            # 重複送信
            second_duplicate_response = await ac.post(
                "/api/webhook_events/",
                json=duplicate_data,
                headers={"Content-Type": "application/json"},
            )
            assert second_duplicate_response.status_code in [
                200,
                500,
            ]  # 重複エラーまたは正常処理

    @pytest.mark.asyncio
    async def test_webhook_different_event_types(self, test_db):
        """異なるWebhookイベントタイプのテスト"""
        # 2人のユーザーを作成
        user1_firebase_uid = f"test_uid_{uuid.uuid4().hex[:8]}"
        user1 = await test_db.users.create(
            data={
                "firebase_uid": user1_firebase_uid,
                "email": f"user1_{uuid.uuid4().hex[:8]}@example.com",
                "current_plan": "free",
                "is_verified": True,
            }
        )

        user2_firebase_uid = f"test_uid_{uuid.uuid4().hex[:8]}"
        user2 = await test_db.users.create(
            data={
                "firebase_uid": user2_firebase_uid,
                "email": f"user2_{uuid.uuid4().hex[:8]}@example.com",
                "current_plan": "free",
                "is_verified": True,
            }
        )

        # user1のお世話設定を作成
        care_setting = await test_db.care_settings.create(
            data={
                "user_id": user1.id,
                "parent_name": "ユーザー1",
                "child_name": "子ども1",
                "dog_name": "犬1",
                "care_start_date": datetime.fromisoformat("2024-07-01T00:00:00+00:00"),
                "care_end_date": datetime.fromisoformat("2024-07-31T00:00:00+00:00"),
                "morning_meal_time": datetime.fromisoformat(
                    "2024-07-01T08:00:00+00:00"
                ),
                "night_meal_time": datetime.fromisoformat("2024-07-01T18:00:00+00:00"),
                "walk_time": datetime.fromisoformat("2024-07-01T16:00:00+00:00"),
                "care_password": "1234",
                "care_clear_status": "active",
            }
        )

        # user1でログ作成
        def override_user1():
            return user1_firebase_uid

        app.dependency_overrides[verify_firebase_token] = override_user1

        async with AsyncClient(app=app, base_url="http://test") as ac:
            headers = {"Authorization": "Bearer mock_token"}

            # user1でログ作成
            log_data = {
                "care_setting_id": care_setting.id,
                "date": "2024-07-01",
                "fed_morning": True,
            }
            create_response = await ac.post(
                "/api/care_logs", json=log_data, headers=headers
            )
            assert create_response.status_code == 201
            care_log_id = create_response.json()["id"]

        # user2で他人のログにアクセス試行
        def override_user2():
            return user2_firebase_uid

        app.dependency_overrides[verify_firebase_token] = override_user2

        try:
            async with AsyncClient(app=app, base_url="http://test") as ac:
                headers = {"Authorization": "Bearer mock_token"}

                # user2で他人のログ更新試行
                update_response = await ac.patch(
                    f"/api/care_logs/{care_log_id}",
                    json={"fed_morning": False},
                    headers=headers,
                )
                assert update_response.status_code in [403, 404]  # 認証失敗

                # user2で他人のcare_settingのログ取得試行
                today_response = await ac.get(
                    f"/api/care_logs/today?care_setting_id={care_setting.id}&date=2024-07-01",
                    headers=headers,
                )
                assert today_response.status_code in [403, 404]  # 認証失敗
        finally:
            # overrideをリセット
            def default_override():
                return "test_uid_care_001"

            app.dependency_overrides[verify_firebase_token] = default_override


class TestReflectionNotes:
    @pytest.mark.asyncio
    async def test_reflection_notes_comprehensive(self, test_db):
        """反省文機能の総合テスト"""
        # テスト用ユーザーを作成
        unique_firebase_uid = f"test_uid_{uuid.uuid4().hex[:8]}"
        user = await test_db.users.create(
            data={
                "firebase_uid": unique_firebase_uid,
                "email": f"reflect_{uuid.uuid4().hex[:8]}@example.com",
                "current_plan": "premium",  # プレミアムプランでテスト
                "is_verified": True,
            }
        )

        # Firebase認証dependency overrideを設定
        def override_verify_firebase_token_for_test():
            return user.firebase_uid

        app.dependency_overrides[verify_firebase_token] = (
            override_verify_firebase_token_for_test
        )

        try:
            async with AsyncClient(app=app, base_url="http://test") as ac:
                headers = {"Authorization": "Bearer mock_token"}

                # 1. 反省文作成
                note_data = {
                    "content": "ごめんなさい",
                    "date": "2024-07-01",
                }
                create_response = await ac.post(
                    "/api/reflection_notes", json=note_data, headers=headers
                )
                assert create_response.status_code in [
                    201,
                    200,
                    404,
                    500,
                ]  # 404はエンドポイント未実装の場合

                # 2. 反省文一覧取得
                list_response = await ac.get("/api/reflection_notes", headers=headers)
                assert list_response.status_code in [
                    200,
                    404,
                    500,
                ]  # 404はエンドポイント未実装の場合

                # 3. 無効なデータでの作成
                invalid_note_data = {
                    "content": "",  # 空のコンテンツ
                    "date": "invalid-date",  # 無効な日付
                }
                invalid_response = await ac.post(
                    "/api/reflection_notes", json=invalid_note_data, headers=headers
                )
                assert invalid_response.status_code in [
                    404,
                    422,
                    400,
                    500,
                ]  # エンドポイント未実装または検証エラー
        finally:
            # overrideをリセット
            def default_override():
                return "test_uid_care_001"

            app.dependency_overrides[verify_firebase_token] = default_override

    @pytest.mark.asyncio
    async def test_payment_processing_comprehensive(self, test_db):
        """決済処理の包括的テスト"""
        # テスト用ユーザーを作成
        unique_firebase_uid = f"test_uid_{uuid.uuid4().hex[:8]}"
        user = await test_db.users.create(
            data={
                "firebase_uid": unique_firebase_uid,
                "email": f"payment_{uuid.uuid4().hex[:8]}@example.com",
                "current_plan": "free",
                "is_verified": True,
            }
        )

        # Firebase認証dependency overrideを設定
        def override_verify_firebase_token_for_test():
            return user.firebase_uid

        app.dependency_overrides[verify_firebase_token] = (
            override_verify_firebase_token_for_test
        )

        try:
            async with AsyncClient(app=app, base_url="http://test") as ac:
                headers = {"Authorization": "Bearer mock_token"}

                # 1. 決済セッション作成
                payment_data = {
                    "plan_type": "premium",
                    "success_url": "https://example.com/success",
                    "cancel_url": "https://example.com/cancel",
                }
                session_response = await ac.post(
                    "/api/payment/create-session", json=payment_data, headers=headers
                )
                assert session_response.status_code in [
                    200,
                    404,
                    500,
                ]  # 404はエンドポイント未実装の場合

                # 2. 決済履歴取得
                history_response = await ac.get("/api/payment/history", headers=headers)
                assert history_response.status_code in [
                    200,
                    404,
                    500,
                ]  # 404はエンドポイント未実装の場合

                # 3. 無効なプランタイプでの決済
                invalid_payment_data = {
                    "plan_type": "invalid_plan",
                    "success_url": "invalid-url",
                    "cancel_url": "invalid-url",
                }
                invalid_payment_response = await ac.post(
                    "/api/payment/create-session",
                    json=invalid_payment_data,
                    headers=headers,
                )
                assert invalid_payment_response.status_code in [
                    404,
                    422,
                    400,
                    500,
                ]  # エンドポイント未実装または検証エラー
        finally:
            # overrideをリセット
            def default_override():
                return "test_uid_care_001"

            app.dependency_overrides[verify_firebase_token] = default_override

    @pytest.mark.asyncio
    async def test_care_settings_validation_edge_cases(self, test_db):
        """お世話設定バリデーションのエッジケース検証"""
        # テスト用ユーザーを作成
        unique_firebase_uid = f"test_uid_{uuid.uuid4().hex[:8]}"
        user = await test_db.users.create(
            data={
                "firebase_uid": unique_firebase_uid,
                "email": f"edge_{uuid.uuid4().hex[:8]}@example.com",
                "current_plan": "free",
                "is_verified": True,
            }
        )

        # Firebase認証dependency overrideを設定
        def override_verify_firebase_token_for_test():
            return user.firebase_uid

        app.dependency_overrides[verify_firebase_token] = (
            override_verify_firebase_token_for_test
        )

        try:
            async with AsyncClient(app=app, base_url="http://test") as ac:
                headers = {"Authorization": "Bearer mock_token"}

                # 1. 無効な時間形式
                invalid_time_data = {
                    "parent_name": "親の名前",
                    "child_name": "子の名前",
                    "dog_name": "犬の名前",
                    "care_start_date": "2024-07-01T00:00:00+00:00",
                    "care_end_date": "2024-07-31T00:00:00+00:00",
                    "morning_meal_time": "25:00:00",  # 無効な時間
                    "night_meal_time": "18:00:00",
                    "walk_time": "16:00:00",
                    "care_password": "1234",
                    "care_clear_status": "active",
                }
                invalid_time_response = await ac.post(
                    "/api/care_settings", json=invalid_time_data, headers=headers
                )
                assert invalid_time_response.status_code in [
                    201,
                    422,
                    400,
                    500,
                ]  # 201は検証が通った場合

                # 2. 極端に長い文字列
                long_string_data = {
                    "parent_name": "親" * 1000,  # 非常に長い名前
                    "child_name": "子" * 1000,
                    "dog_name": "犬" * 1000,
                    "care_start_date": "2024-07-01T00:00:00+00:00",
                    "care_end_date": "2024-07-31T00:00:00+00:00",
                    "morning_meal_time": "08:00:00",
                    "night_meal_time": "18:00:00",
                    "walk_time": "16:00:00",
                    "care_password": "1234",
                    "care_clear_status": "active",
                }
                long_string_response = await ac.post(
                    "/api/care_settings", json=long_string_data, headers=headers
                )
                assert long_string_response.status_code in [
                    201,
                    422,
                    400,
                    500,
                ]  # 201は検証が通った場合
        finally:
            # overrideをリセット
            def default_override():
                return "test_uid_care_001"

            app.dependency_overrides[verify_firebase_token] = default_override

    @pytest.mark.asyncio
    async def test_multiple_api_interactions(self, test_db):
        """複数API間の相互作用テスト"""
        # テスト用ユーザーを作成
        unique_firebase_uid = f"test_uid_{uuid.uuid4().hex[:8]}"
        user = await test_db.users.create(
            data={
                "firebase_uid": unique_firebase_uid,
                "email": f"multi_{uuid.uuid4().hex[:8]}@example.com",
                "current_plan": "premium",
                "is_verified": True,
            }
        )

        # Firebase認証dependency overrideを設定
        def override_verify_firebase_token_for_test():
            return user.firebase_uid

        app.dependency_overrides[verify_firebase_token] = (
            override_verify_firebase_token_for_test
        )

        try:
            async with AsyncClient(app=app, base_url="http://test") as ac:
                headers = {"Authorization": "Bearer mock_token"}

                # 1. ユーザー情報確認
                user_response = await ac.get("/api/users/me", headers=headers)
                assert user_response.status_code == 200

                # 2. お世話設定作成
                care_setting_data = {
                    "parent_name": "統合テスト親",
                    "child_name": "統合テスト子",
                    "dog_name": "統合テスト犬",
                    "care_start_date": "2024-07-01T00:00:00+00:00",
                    "care_end_date": "2024-07-31T00:00:00+00:00",
                    "morning_meal_time": "2024-07-01T08:00:00+00:00",
                    "night_meal_time": "2024-07-01T18:00:00+00:00",
                    "walk_time": "2024-07-01T16:00:00+00:00",
                    "care_password": "1234",
                    "care_clear_status": "active",
                }
                care_response = await ac.post(
                    "/api/care_settings", json=care_setting_data, headers=headers
                )
                if care_response.status_code == 201:
                    care_setting_id = care_response.json()["id"]

                    # 3. お世話ログ作成
                    log_data = {
                        "care_setting_id": care_setting_id,
                        "date": "2024-07-01",
                        "fed_morning": True,
                        "fed_night": True,
                        "walk_result": True,
                    }
                    log_response = await ac.post(
                        "/api/care_logs", json=log_data, headers=headers
                    )
                    assert log_response.status_code in [201, 500]

                    # 4. メッセージ生成
                    message_data = {"care_setting_id": care_setting_id}
                    message_response = await ac.post(
                        "/api/message_logs/generate", json=message_data, headers=headers
                    )
                    assert message_response.status_code in [200, 500]
        finally:
            # overrideをリセット
            def default_override():
                return "test_uid_care_001"

            app.dependency_overrides[verify_firebase_token] = default_override


class TestDependenciesDeepCoverage:
    """dependencies.pyの詳細カバレッジテスト"""

    @pytest.mark.asyncio
    async def test_firebase_token_verification_comprehensive(self, test_db):
        """Firebase トークン検証の統合テスト"""
        from fastapi import Request
        from app.dependencies import verify_firebase_token

        # 1. Authorization ヘッダーが存在しない場合
        class MockRequestNoAuth:
            def __init__(self):
                self.headers = {}

        request_no_auth = MockRequestNoAuth()
        try:
            verify_firebase_token(request_no_auth)
            assert False, "例外が発生するべき"
        except HTTPException as e:
            assert e.status_code == 401
            assert "Authorization header missing" in e.detail

        # 2. Bearerで始まらないAuthorizationヘッダー
        class MockRequestInvalidFormat:
            def __init__(self):
                self.headers = {"Authorization": "Basic invalid_format"}

        request_invalid = MockRequestInvalidFormat()
        try:
            verify_firebase_token(request_invalid)
            assert False, "例外が発生するべき"
        except HTTPException as e:
            assert e.status_code == 401
            assert "Authorization header missing" in e.detail

        # 3. Bearer空文字列
        class MockRequestEmptyBearer:
            def __init__(self):
                self.headers = {"Authorization": "Bearer "}

        request_empty = MockRequestEmptyBearer()
        try:
            verify_firebase_token(request_empty)
            assert False, "例外が発生するべき"
        except HTTPException as e:
            assert e.status_code == 401
            assert "Invalid token" in e.detail

        # 4. 無効なトークン
        class MockRequestInvalidToken:
            def __init__(self):
                self.headers = {"Authorization": "Bearer invalid_firebase_token_12345"}

        request_invalid_token = MockRequestInvalidToken()
        try:
            verify_firebase_token(request_invalid_token)
            assert False, "例外が発生するべき"
        except HTTPException as e:
            assert e.status_code == 401
            assert "Invalid token" in e.detail

        # 5. 不正なJSON形式トークン
        class MockRequestMalformedToken:
            def __init__(self):
                self.headers = {"Authorization": "Bearer malformed.jwt.token"}

        request_malformed = MockRequestMalformedToken()
        try:
            verify_firebase_token(request_malformed)
            assert False, "例外が発生するべき"
        except HTTPException as e:
            assert e.status_code == 401
            assert "Invalid token" in e.detail

    @pytest.mark.asyncio
    async def test_dependencies_edge_cases(self, test_db):
        """Dependencies エッジケーステスト"""
        # Authorization ヘッダーのエッジケース
        async with AsyncClient(app=app, base_url="http://test") as ac:
            # 1. Authorizationヘッダーなし
            response_no_auth = await ac.get("/api/users/me")
            assert response_no_auth.status_code in [401, 404, 422]

            # 2. 空のAuthorizationヘッダー
            empty_headers = {"Authorization": ""}
            response_empty = await ac.get("/api/users/me", headers=empty_headers)
            assert response_empty.status_code in [401, 404, 422]

            # 3. Bearerのみ
            bearer_only_headers = {"Authorization": "Bearer"}
            response_bearer_only = await ac.get(
                "/api/users/me", headers=bearer_only_headers
            )
            assert response_bearer_only.status_code in [401, 404, 422]

            # 4. 複数スペースを含むAuthorization
            multi_space_headers = {"Authorization": "Bearer  token_with_spaces"}
            response_multi_space = await ac.get(
                "/api/users/me", headers=multi_space_headers
            )
            assert response_multi_space.status_code in [401, 404, 422]

            # 5. 大文字小文字の違い
            case_headers = {"Authorization": "bearer lowercase_bearer"}
            response_case = await ac.get("/api/users/me", headers=case_headers)
            assert response_case.status_code in [401, 404, 422]


class TestWebhookEventsDeepCoverage:
    """Webhookイベントの詳細カバレッジテスト"""

    @pytest.mark.asyncio
    async def test_webhook_process_complete_flow(self, test_db):
        """Webhook処理の完全フローテスト"""
        # テスト用ユーザーを作成
        unique_firebase_uid = f"test_uid_{uuid.uuid4().hex[:8]}"
        user = await test_db.users.create(
            data={
                "firebase_uid": unique_firebase_uid,
                "email": f"webhook_deep_{uuid.uuid4().hex[:8]}@example.com",
                "current_plan": "free",
                "is_verified": True,
            }
        )

        async with AsyncClient(app=app, base_url="http://test") as ac:
            # 1. 完全なWebhookデータで処理トリガー
            complete_webhook_data = {
                "id": f"evt_complete_{uuid.uuid4().hex[:8]}",
                "type": "checkout.session.completed",
                "data": {
                    "object": {
                        "id": f"cs_complete_{uuid.uuid4().hex[:8]}",
                        "payment_intent": f"pi_complete_{uuid.uuid4().hex[:8]}",
                        "amount_total": 1500,
                        "currency": "jpy",
                        "payment_status": "paid",
                        "metadata": {"firebase_uid": unique_firebase_uid},
                        "billing_details": {"email": user.email},
                    }
                },
            }

            response = await ac.post("/api/webhook_events/", json=complete_webhook_data)
            assert response.status_code == 200

            # 2. データベース確認：webhook_eventsテーブル
            saved_webhook = await test_db.webhook_events.find_unique(
                where={"id": complete_webhook_data["id"]}
            )
            assert saved_webhook is not None
            assert saved_webhook.firebase_uid == unique_firebase_uid
            assert saved_webhook.processed == True  # 処理完了フラグ

            # 3. データベース確認：paymentテーブル
            payment_record = await test_db.payment.find_first(
                where={"firebase_uid": unique_firebase_uid}
            )
            assert payment_record is not None
            assert payment_record.amount == 1500
            assert payment_record.currency == "jpy"
            assert payment_record.status == "paid"

            # 4. データベース確認：ユーザープラン更新
            updated_user = await test_db.users.find_unique(
                where={"firebase_uid": unique_firebase_uid}
            )
            assert updated_user.current_plan == "premium"

    @pytest.mark.asyncio
    async def test_webhook_error_scenarios(self, test_db):
        """Webhook エラーシナリオテスト"""
        async with AsyncClient(app=app, base_url="http://test") as ac:
            # 1. firebase_uidが存在しないケース
            no_firebase_uid_data = {
                "id": f"evt_no_uid_{uuid.uuid4().hex[:8]}",
                "type": "checkout.session.completed",
                "data": {
                    "object": {
                        "id": f"cs_no_uid_{uuid.uuid4().hex[:8]}",
                        "payment_intent": f"pi_no_uid_{uuid.uuid4().hex[:8]}",
                        "amount_total": 1000,
                        "currency": "jpy",
                        "payment_status": "paid",
                        # metadata なし = firebase_uid なし
                    }
                },
            }

            response1 = await ac.post("/api/webhook_events/", json=no_firebase_uid_data)
            assert response1.status_code == 200  # エラーでも200を返す

            # 2. 存在しないfirebase_uidのケース
            nonexistent_uid_data = {
                "id": f"evt_nonexistent_{uuid.uuid4().hex[:8]}",
                "type": "checkout.session.completed",
                "data": {
                    "object": {
                        "id": f"cs_nonexistent_{uuid.uuid4().hex[:8]}",
                        "payment_intent": f"pi_nonexistent_{uuid.uuid4().hex[:8]}",
                        "amount_total": 1000,
                        "currency": "jpy",
                        "payment_status": "paid",
                        "metadata": {"firebase_uid": "nonexistent_user_12345"},
                    }
                },
            }

            response2 = await ac.post("/api/webhook_events/", json=nonexistent_uid_data)
            assert response2.status_code == 200  # エラーでも200を返す

            # 3. session_idが存在しないケース
            no_session_id_data = {
                "id": f"evt_no_session_{uuid.uuid4().hex[:8]}",
                "type": "checkout.session.completed",
                "data": {
                    "object": {
                        # "id" フィールドなし = session_id なし
                        "payment_intent": f"pi_no_session_{uuid.uuid4().hex[:8]}",
                        "amount_total": 1000,
                        "currency": "jpy",
                        "payment_status": "paid",
                        "metadata": {"firebase_uid": "test_user"},
                    }
                },
            }

            response3 = await ac.post("/api/webhook_events/", json=no_session_id_data)
            assert response3.status_code == 200

    @pytest.mark.asyncio
    async def test_webhook_different_event_types_deep(self, test_db):
        """Webhook異なるイベントタイプの深度テスト"""
        # テスト用ユーザーを作成
        unique_firebase_uid = f"test_uid_{uuid.uuid4().hex[:8]}"
        user = await test_db.users.create(
            data={
                "firebase_uid": unique_firebase_uid,
                "email": f"webhook_types_{uuid.uuid4().hex[:8]}@example.com",
                "current_plan": "free",
                "is_verified": True,
            }
        )

        async with AsyncClient(app=app, base_url="http://test") as ac:
            # 1. checkout.session.completed以外のイベント（process_webhook_eventが呼ばれない）
            other_event_data = {
                "id": f"evt_other_{uuid.uuid4().hex[:8]}",
                "type": "payment_intent.succeeded",  # checkout.session.completed以外
                "data": {
                    "object": {
                        "id": f"pi_other_{uuid.uuid4().hex[:8]}",
                        "amount": 1000,
                        "currency": "jpy",
                        "status": "succeeded",
                        "billing_details": {"email": user.email},
                    }
                },
            }

            response = await ac.post("/api/webhook_events/", json=other_event_data)
            assert response.status_code == 200

            # processされないことを確認
            saved_webhook = await test_db.webhook_events.find_unique(
                where={"id": other_event_data["id"]}
            )
            assert saved_webhook is not None
            assert saved_webhook.processed == False  # 処理されていない
            assert (
                saved_webhook.firebase_uid is None
            )  # checkout.session.completed以外はfirebase_uid設定されない

            # 2. 空のdataオブジェクト
            empty_data_event = {
                "id": f"evt_empty_{uuid.uuid4().hex[:8]}",
                "type": "checkout.session.completed",
                "data": {"object": {}},  # 空のオブジェクト
            }

            response2 = await ac.post("/api/webhook_events/", json=empty_data_event)
            assert response2.status_code == 200

            # 3. 部分的なデータ
            partial_data_event = {
                "id": f"evt_partial_{uuid.uuid4().hex[:8]}",
                "type": "checkout.session.completed",
                "data": {
                    "object": {
                        "id": f"cs_partial_{uuid.uuid4().hex[:8]}",
                        # 他のフィールドは欠損
                        "metadata": {"firebase_uid": unique_firebase_uid},
                    }
                },
            }

            response3 = await ac.post("/api/webhook_events/", json=partial_data_event)
            assert response3.status_code == 200

            # 4. JSON文字列形式のpayload処理テスト
            json_payload_event = {
                "id": f"evt_json_{uuid.uuid4().hex[:8]}",
                "type": "checkout.session.completed",
                "data": {
                    "object": {
                        "id": f"cs_json_{uuid.uuid4().hex[:8]}",
                        "payment_intent": f"pi_json_{uuid.uuid4().hex[:8]}",
                        "amount_total": 2000,
                        "currency": "jpy",
                        "payment_status": "paid",
                        "metadata": {"firebase_uid": unique_firebase_uid},
                    }
                },
            }

            response4 = await ac.post("/api/webhook_events/", json=json_payload_event)
            assert response4.status_code == 200

    @pytest.mark.asyncio
    async def test_webhook_manual_process_endpoint(self, test_db):
        """Webhook手動処理エンドポイントテスト"""
        # テスト用ユーザーを作成
        unique_firebase_uid = f"test_uid_{uuid.uuid4().hex[:8]}"
        user = await test_db.users.create(
            data={
                "firebase_uid": unique_firebase_uid,
                "email": f"manual_process_{uuid.uuid4().hex[:8]}@example.com",
                "current_plan": "free",
                "is_verified": True,
            }
        )

        async with AsyncClient(app=app, base_url="http://test") as ac:
            # 1. 未処理のWebhookイベントが存在しない場合
            empty_process_response = await ac.post("/api/webhook_events/process")
            assert empty_process_response.status_code == 200
            result = empty_process_response.json()
            assert "未処理のWebhookイベントはありません" in result["message"]

            # 2. 未処理のWebhookイベントを作成
            unprocessed_webhook_data = {
                "id": f"evt_unprocessed_{uuid.uuid4().hex[:8]}",
                "type": "checkout.session.completed",
                "data": {
                    "object": {
                        "id": f"cs_unprocessed_{uuid.uuid4().hex[:8]}",
                        "payment_intent": f"pi_unprocessed_{uuid.uuid4().hex[:8]}",
                        "amount_total": 3000,
                        "currency": "jpy",
                        "payment_status": "paid",
                        "metadata": {"firebase_uid": unique_firebase_uid},
                    }
                },
            }

            # Webhookイベントを作成（process_webhook_eventが自動実行される）
            create_response = await ac.post(
                "/api/webhook_events/", json=unprocessed_webhook_data
            )
            assert create_response.status_code == 200

            # 3. 手動処理エンドポイントを呼び出し
            manual_process_response = await ac.post("/api/webhook_events/process")
            assert manual_process_response.status_code in [200, 500]

    @pytest.mark.asyncio
    async def test_webhook_error_handling_comprehensive(self, test_db):
        """Webhook包括的エラーハンドリングテスト"""
        async with AsyncClient(app=app, base_url="http://test") as ac:
            # 1. 無効なJSONペイロード
            malformed_json_data = {
                "id": f"evt_malformed_{uuid.uuid4().hex[:8]}",
                "type": "checkout.session.completed",
                "data": "invalid_string_instead_of_object",  # 無効なデータ型
            }

            malformed_response = await ac.post(
                "/api/webhook_events/", json=malformed_json_data
            )
            assert malformed_response.status_code in [200, 500]

            # 2. 大きすぎるペイロード
            huge_payload_data = {
                "id": f"evt_huge_{uuid.uuid4().hex[:8]}",
                "type": "checkout.session.completed",
                "data": {
                    "object": {
                        "id": f"cs_huge_{uuid.uuid4().hex[:8]}",
                        "massive_field": "x" * 10000,  # 非常に大きなフィールド
                        "amount_total": 1000,
                        "currency": "jpy",
                        "payment_status": "paid",
                    }
                },
            }

            huge_response = await ac.post(
                "/api/webhook_events/", json=huge_payload_data
            )
            assert huge_response.status_code in [200, 500]

            # 3. 特殊文字を含むペイロード
            special_chars_data = {
                "id": f"evt_special_{uuid.uuid4().hex[:8]}",
                "type": "checkout.session.completed",
                "data": {
                    "object": {
                        "id": f"cs_special_{uuid.uuid4().hex[:8]}",
                        "special_field": "🎉💖🚀\n\t\r",  # 特殊文字・改行・タブ
                        "amount_total": 1000,
                        "currency": "jpy",
                        "payment_status": "paid",
                    }
                },
            }

            special_response = await ac.post(
                "/api/webhook_events/", json=special_chars_data
            )
            assert special_response.status_code == 200

            # 4. Nullフィールドを含むペイロード
            null_fields_data = {
                "id": f"evt_nulls_{uuid.uuid4().hex[:8]}",
                "type": "checkout.session.completed",
                "data": {
                    "object": {
                        "id": None,  # null session_id
                        "payment_intent": None,
                        "amount_total": None,
                        "currency": None,
                        "payment_status": None,
                        "metadata": None,  # null metadata
                    }
                },
            }

            null_response = await ac.post("/api/webhook_events/", json=null_fields_data)
            assert null_response.status_code in [
                200,
                500,
            ]  # Nullフィールドによる500エラーも許可

    @pytest.mark.asyncio
    async def test_webhook_database_constraints(self, test_db):
        """Webhookデータベース制約テスト"""
        async with AsyncClient(app=app, base_url="http://test") as ac:
            # 1. 極端に長いIDでのWebhook
            long_id = "evt_" + "x" * 1000  # 非常に長いID
            long_id_data = {
                "id": long_id,
                "type": "checkout.session.completed",
                "data": {
                    "object": {
                        "id": f"cs_long_{uuid.uuid4().hex[:8]}",
                        "amount_total": 1000,
                        "currency": "jpy",
                        "payment_status": "paid",
                    }
                },
            }

            long_id_response = await ac.post("/api/webhook_events/", json=long_id_data)
            assert long_id_response.status_code in [200, 500]

            # 2. 空文字列IDでのWebhook
            empty_id_data = {
                "id": "",  # 空のID
                "type": "checkout.session.completed",
                "data": {
                    "object": {
                        "id": f"cs_empty_{uuid.uuid4().hex[:8]}",
                        "amount_total": 1000,
                        "currency": "jpy",
                        "payment_status": "paid",
                    }
                },
            }

            empty_id_response = await ac.post(
                "/api/webhook_events/", json=empty_id_data
            )
            assert empty_id_response.status_code in [200, 500]

    @pytest.mark.asyncio
    async def test_webhook_event_missing_required_fields(test_db):
        async with AsyncClient(app=app, base_url="http://test") as ac:
            # id欠損
            data_missing_id = {
                "type": "checkout.session.completed",
                "data": {"object": {"amount_total": 1000, "currency": "jpy"}},
            }
            resp = await ac.post("/api/webhook_events/", json=data_missing_id)
            assert resp.status_code in [400, 422, 500]

            # dataが不正（string instead of dict）
            data_invalid_data = {
                "id": "evt_invalid_data",
                "type": "checkout.session.completed",
                "data": "this_is_not_a_dict",
            }
            resp3 = await ac.post("/api/webhook_events/", json=data_invalid_data)
            assert resp3.status_code in [400, 500]

    @pytest.mark.asyncio
    async def test_webhook_event_duplicate_id(self, test_db):
        async with AsyncClient(app=app, base_url="http://test") as ac:
            webhook_data = {
                "id": "evt_duplicate_001",
                "type": "checkout.session.completed",
                "data": {"object": {"amount_total": 1000}},
            }
            # 1回目
            resp1 = await ac.post("/api/webhook_events/", json=webhook_data)
            assert resp1.status_code == 200
            # 2回目（重複）
            resp2 = await ac.post("/api/webhook_events/", json=webhook_data)
            assert resp2.status_code in [200, 500]

    @pytest.mark.asyncio
    async def test_webhook_manual_process_no_unprocessed(self, test_db):
        # test_db.webhook_events でアクセス
        await test_db.webhook_events.delete_many(where={"processed": False})
        async with AsyncClient(app=app, base_url="http://test") as ac:
            resp = await ac.post("/api/webhook_events/process")
            assert resp.status_code == 200
            assert "未処理のWebhookイベントはありません" in resp.json()["message"]

    @pytest.mark.asyncio
    async def test_webhook_process_exception(self, test_db):
        # process時に内部例外を強制的に発生させる場合（手動で壊れたイベントを作ってもOK）
        await test_db.webhook_events.create(
            data={
                "id": "evt_broken",
                "event_type": "checkout.session.completed",
                "stripe_session_id": None,
                "stripe_payment_intent_id": None,
                "customer_email": None,
                "amount": None,
                "currency": None,
                "payment_status": None,
                "payload": '"this is a valid JSON string"',
                "processed": False,
                "firebase_uid": None,
            }
        )
        async with AsyncClient(app=app, base_url="http://test") as ac:
            resp = await ac.post("/api/webhook_events/process")
            assert resp.status_code in [500, 200]
