import pytest
import asyncio
from httpx import AsyncClient
from app.main import app
from app.dependencies import verify_firebase_token
import uuid


class TestCareLogIntegration:
    """お世話ログの統合テスト"""

    @pytest.mark.asyncio
    async def test_complete_care_flow(self, test_db):
        """完全なお世話フローのテスト"""
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

        # テスト用お世話設定を作成（正しい日付時間フォーマットを使用）
        care_setting = await test_db.care_settings.create(
            data={
                "user_id": user.id,
                "parent_name": "テスト保護者",
                "child_name": "太郎",
                "dog_name": "ポチ",
                "care_start_date": "2024-07-01T00:00:00.000Z",
                "care_end_date": "2024-07-31T00:00:00.000Z",
                "morning_meal_time": "2024-07-01T08:00:00.000Z",
                "night_meal_time": "2024-07-01T18:00:00.000Z",
                "walk_time": "2024-07-01T16:00:00.000Z",
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

                # 1. お世話設定作成（API経由でのテストではなく、直接作成済み）

                # 2. お世話ログ作成
                care_log_data = {
                    "care_setting_id": care_setting_id,
                    "date": "2024-07-01",
                    "fed_morning": True,
                    "fed_night": False,
                    "walk_result": True,
                    "walk_total_distance_m": 1500,
                }
                log_response = await ac.post(
                    "/api/care_logs", json=care_log_data, headers=headers
                )
                assert log_response.status_code == 201

                # 3. 今日のログ取得
                today_logs = await ac.get(
                    f"/api/care_logs/today?care_setting_id={care_setting_id}&date=2024-07-01",
                    headers=headers,
                )
                assert today_logs.status_code == 200
                today_data = today_logs.json()
                assert today_data["fed_morning"] == True
                assert today_data["walked"] == True

                # 4. ログ一覧取得
                logs_list = await ac.get(
                    f"/api/care_logs/list?care_setting_id={care_setting_id}",
                    headers=headers,
                )
                assert logs_list.status_code == 200
                logs_data = logs_list.json()
                assert len(logs_data["care_logs"]) == 1
        finally:
            # overrideをリセット
            def default_override():
                return "test_uid_care_001"

            app.dependency_overrides[verify_firebase_token] = default_override

    @pytest.mark.asyncio
    async def test_reflection_notes_integration(self, test_db):
        """反省文の統合テスト"""
        # テスト用ユーザーを作成
        unique_firebase_uid = f"test_uid_{uuid.uuid4().hex[:8]}"
        user = await test_db.users.create(
            data={
                "firebase_uid": unique_firebase_uid,
                "email": f"reflection_{uuid.uuid4().hex[:8]}@example.com",
                "current_plan": "free",
                "is_verified": True,
            }
        )

        # テスト用お世話設定を作成
        care_setting = await test_db.care_settings.create(
            data={
                "user_id": user.id,
                "parent_name": "反省テスト保護者",
                "child_name": "反省太郎",
                "dog_name": "反省ポチ",
                "care_start_date": "2024-07-01T00:00:00.000Z",
                "care_end_date": "2024-07-31T00:00:00.000Z",
                "morning_meal_time": "2024-07-01T08:00:00.000Z",
                "night_meal_time": "2024-07-01T18:00:00.000Z",
                "walk_time": "2024-07-01T16:00:00.000Z",
                "care_clear_status": "active",
                "care_password": "1234",
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

                # 1. 反省文作成
                reflection_data = {
                    "care_setting_id": care_setting_id,
                    "content": "今日は朝ごはんをあげるのを忘れてしまいました。明日からは気をつけます。",
                }
                reflection_response = await ac.post(
                    "/api/reflection_notes", json=reflection_data, headers=headers
                )
                assert reflection_response.status_code == 201
                reflection_id = reflection_response.json()["id"]

                # 2. 反省文一覧取得
                notes_list = await ac.get(
                    f"/api/reflection_notes?care_setting_id={care_setting_id}",
                    headers=headers,
                )
                assert notes_list.status_code == 200
                notes_data = notes_list.json()
                assert len(notes_data) == 1
                assert notes_data[0]["approved_by_parent"] == False

                # 3. 保護者による承認
                approve_data = {"approved_by_parent": True}
                approve_response = await ac.patch(
                    f"/api/reflection_notes/{reflection_id}",
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

    @pytest.mark.asyncio
    async def test_user_care_setting_flow(self, test_db):
        """ユーザーとお世話設定の統合フロー"""
        async with AsyncClient(app=app, base_url="http://test") as ac:
            headers = {"Authorization": "Bearer mock_token"}

            # 1. ユーザー作成
            unique_firebase_uid = f"test_uid_{uuid.uuid4().hex[:8]}"
            user_data = {
                "firebase_uid": unique_firebase_uid,
                "email": f"integration_{uuid.uuid4().hex[:8]}@example.com",
                "current_plan": "free",
                "is_verified": True,
            }
            user_response = await ac.post("/api/users/", json=user_data)
            assert user_response.status_code == 201
            user_id = user_response.json()["id"]

            # Firebase認証dependency overrideを動的に設定
            def override_verify_firebase_token_for_test():
                return unique_firebase_uid

            app.dependency_overrides[verify_firebase_token] = (
                override_verify_firebase_token_for_test
            )

            try:
                # 2. お世話設定作成（正しいフォーマットを使用）
                care_setting_data = {
                    "parent_name": "統合テスト保護者",
                    "child_name": "統合太郎",
                    "dog_name": "統合ポチ",
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

                # 3. お世話設定取得
                my_settings = await ac.get("/api/care_settings/me", headers=headers)
                assert my_settings.status_code == 200
                settings_data = my_settings.json()
                assert settings_data["child_name"] == "統合太郎"
                assert settings_data["dog_name"] == "統合ポチ"

                # 4. PIN認証
                pin_data = {"input_password": "1234"}
                pin_response = await ac.post(
                    "/api/care_settings/verify_pin", json=pin_data, headers=headers
                )
                assert pin_response.status_code == 200
                assert pin_response.json()["verified"] == True

                # 5. 間違ったPIN
                wrong_pin_data = {"input_password": "5678"}
                wrong_pin_response = await ac.post(
                    "/api/care_settings/verify_pin",
                    json=wrong_pin_data,
                    headers=headers,
                )
                assert wrong_pin_response.status_code == 200
                assert wrong_pin_response.json()["verified"] == False
            finally:
                # overrideをリセット
                def default_override():
                    return "test_uid_care_001"

                app.dependency_overrides[verify_firebase_token] = default_override
