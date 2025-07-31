import pytest
import asyncio
from datetime import datetime, timezone


class TestDatabaseIntegration:
    """データベース統合テスト"""

    @pytest.mark.asyncio
    async def test_user_care_setting_relationship(self, test_db):
        """ユーザーとお世話設定の関係性テスト"""
        # 1. ユーザー作成
        user = await test_db.users.create(
            data={
                "firebase_uid": "test_db_uid_001",
                "email": "dbtest@example.com",
                "current_plan": "free",
                "is_verified": True,
            }
        )

        # 2. お世話設定作成（ユーザーとの関連付け）
        care_setting = await test_db.care_settings.create(
            data={
                "user_id": user.id,
                "parent_name": "テスト保護者",
                "child_name": "テスト子ども",
                "dog_name": "テスト犬",
                "care_password": "1234",
                "care_clear_status": "active",
            }
        )

        # 3. 関係性確認
        assert care_setting.user_id == user.id

        # 4. リレーションクエリテスト
        user_with_settings = await test_db.users.find_unique(
            where={"id": user.id}, include={"care_settings": True}
        )

        assert user_with_settings is not None
        assert user_with_settings.care_settings is not None
        assert len(user_with_settings.care_settings) == 1
        assert user_with_settings.care_settings[0].dog_name == "テスト犬"

    @pytest.mark.asyncio
    async def test_care_setting_logs_relationship(self, test_db):
        """お世話設定とログの関係性テスト"""
        # 前提: ユーザーとお世話設定を作成
        user = await test_db.users.create(
            data={
                "firebase_uid": "test_db_uid_002",
                "email": "dbtest2@example.com",
                "current_plan": "free",
                "is_verified": True,
            }
        )

        care_setting = await test_db.care_settings.create(
            data={
                "user_id": user.id,
                "child_name": "テスト子ども2",
                "dog_name": "テスト犬2",
                "care_clear_status": "active",
            }
        )

        # 1. 複数のお世話ログを作成
        log1 = await test_db.care_logs.create(
            data={
                "care_setting_id": care_setting.id,
                "date": "2024-07-01",
                "fed_morning": True,
                "walk_result": False,
            }
        )

        log2 = await test_db.care_logs.create(
            data={
                "care_setting_id": care_setting.id,
                "date": "2024-07-02",
                "fed_morning": False,
                "walk_result": True,
                "walk_total_distance_m": 2000,
            }
        )

        # 2. 関係性確認
        setting_with_logs = await test_db.care_settings.find_unique(
            where={"id": care_setting.id}, include={"care_logs": True}
        )

        assert setting_with_logs is not None
        assert setting_with_logs.care_logs is not None
        assert len(setting_with_logs.care_logs) == 2

        # 日付でソートして確認
        logs_by_date = sorted(setting_with_logs.care_logs, key=lambda x: x.date)
        assert logs_by_date[0].date == "2024-07-01"
        assert logs_by_date[1].walk_total_distance_m == 2000

    @pytest.mark.asyncio
    async def test_reflection_notes_relationship(self, test_db):
        """反省文の関係性テスト"""
        # 前提データ作成
        user = await test_db.users.create(
            data={
                "firebase_uid": "test_db_uid_003",
                "email": "dbtest3@example.com",
                "current_plan": "free",
                "is_verified": True,
            }
        )

        care_setting = await test_db.care_settings.create(
            data={
                "user_id": user.id,
                "child_name": "テスト子ども3",
                "dog_name": "テスト犬3",
                "care_clear_status": "active",
            }
        )

        # 1. 反省文作成
        note = await test_db.reflection_notes.create(
            data={
                "care_setting_id": care_setting.id,
                "content": "今日は散歩をサボってしまいました。",
                "approved_by_parent": False,
            }
        )

        # 2. 関係性確認
        setting_with_notes = await test_db.care_settings.find_unique(
            where={"id": care_setting.id}, include={"reflection_notes": True}
        )

        assert setting_with_notes is not None
        assert setting_with_notes.reflection_notes is not None
        assert len(setting_with_notes.reflection_notes) == 1
        assert (
            setting_with_notes.reflection_notes[0].content
            == "今日は散歩をサボってしまいました。"
        )
        assert setting_with_notes.reflection_notes[0].approved_by_parent == False

    @pytest.mark.asyncio
    async def test_payment_user_relationship(self, test_db):
        """決済とユーザーの関係性テスト"""
        # 1. ユーザー作成
        user = await test_db.users.create(
            data={
                "firebase_uid": "test_db_uid_004",
                "email": "payment@example.com",
                "current_plan": "free",
                "is_verified": True,
            }
        )

        # 2. 決済記録作成
        payment = await test_db.payment.create(
            data={
                "user_id": user.id,
                "firebase_uid": user.firebase_uid,
                "stripe_session_id": "cs_test_session_001",
                "amount": 500,
                "currency": "jpy",
                "status": "paid",
            }
        )

        # 3. 関係性確認
        assert payment.user_id == user.id
        assert payment.firebase_uid == user.firebase_uid

        # 4. ユーザープラン更新確認
        updated_user = await test_db.users.update(
            where={"id": user.id}, data={"current_plan": "premium"}
        )
        assert updated_user is not None
        assert updated_user.current_plan == "premium"

    @pytest.mark.asyncio
    async def test_data_cascade_deletion(self, test_db):
        """カスケード削除のテスト"""
        # 1. 完全なデータセット作成
        user = await test_db.users.create(
            data={
                "firebase_uid": "test_cascade_uid",
                "email": "cascade@example.com",
                "current_plan": "free",
                "is_verified": True,
            }
        )

        care_setting = await test_db.care_settings.create(
            data={
                "user_id": user.id,
                "child_name": "カスケードテスト",
                "dog_name": "カスケード犬",
                "care_clear_status": "active",
            }
        )

        # 関連データ作成
        care_log = await test_db.care_logs.create(
            data={
                "care_setting_id": care_setting.id,
                "date": "2024-07-01",
                "fed_morning": True,
            }
        )

        reflection_note = await test_db.reflection_notes.create(
            data={
                "care_setting_id": care_setting.id,
                "content": "カスケードテスト反省文",
            }
        )

        # 2. 関連データを手動で削除（外部キー制約があるため）
        await test_db.care_logs.delete(where={"id": care_log.id})
        await test_db.reflection_notes.delete(where={"id": reflection_note.id})
        await test_db.care_settings.delete(where={"id": care_setting.id})
        await test_db.users.delete(where={"id": user.id})

        # 3. 削除されているか確認
        deleted_user = await test_db.users.find_unique(where={"id": user.id})
        assert deleted_user is None

    @pytest.mark.asyncio
    async def test_data_integrity_constraints(self, test_db):
        """データ整合性制約のテスト"""
        # 1. 重複Firebase UID テスト
        user1 = await test_db.users.create(
            data={
                "firebase_uid": "duplicate_test_uid",
                "email": "user1@example.com",
                "current_plan": "free",
                "is_verified": True,
            }
        )

        # 同じFirebase UIDで作成しようとするとエラーになるはず
        with pytest.raises(Exception):  # Unique制約違反
            await test_db.users.create(
                data={
                    "firebase_uid": "duplicate_test_uid",
                    "email": "user2@example.com",
                    "current_plan": "free",
                    "is_verified": True,
                }
            )

        # 2. 重複emailテスト
        with pytest.raises(Exception):  # Unique制約違反
            await test_db.users.create(
                data={
                    "firebase_uid": "different_uid",
                    "email": "user1@example.com",  # 同じemail
                    "current_plan": "free",
                    "is_verified": True,
                }
            )

        # 3. 存在しないuser_idでお世話設定作成（外部キー制約）
        with pytest.raises(Exception):  # Foreign key制約違反
            await test_db.care_settings.create(
                data={
                    "user_id": "550e8400-e29b-41d4-a716-446655440000",  # 存在しないUUID
                    "child_name": "テストNG",
                    "dog_name": "テストNG犬",
                    "care_clear_status": "active",
                }
            )

    @pytest.mark.asyncio
    async def test_date_time_handling(self, test_db):
        """日時データの扱いテスト"""
        # 1. ユーザー作成
        user = await test_db.users.create(
            data={
                "firebase_uid": "datetime_test_uid",
                "email": "datetime@example.com",
                "current_plan": "free",
                "is_verified": True,
            }
        )

        # 2. 日時データ付きお世話設定作成
        care_setting = await test_db.care_settings.create(
            data={
                "user_id": user.id,
                "child_name": "日時テスト",
                "dog_name": "日時犬",
                "care_start_date": "2024-07-01T00:00:00.000Z",
                "care_end_date": "2024-07-31T00:00:00.000Z",
                "morning_meal_time": "2024-07-01T08:00:00.000Z",
                "night_meal_time": "2024-07-01T18:00:00.000Z",
                "walk_time": "2024-07-01T16:00:00.000Z",
                "care_clear_status": "active",
            }
        )

        # 3. 日時データの確認
        assert care_setting.care_start_date is not None
        assert care_setting.morning_meal_time is not None
        assert care_setting.created_at is not None

    @pytest.mark.asyncio
    async def test_complex_query_with_joins(self, test_db):
        """複雑なクエリとJOINのテスト"""
        # 1. テストデータ作成
        user = await test_db.users.create(
            data={
                "firebase_uid": "complex_query_uid",
                "email": "complex@example.com",
                "current_plan": "premium",
                "is_verified": True,
            }
        )

        care_setting = await test_db.care_settings.create(
            data={
                "user_id": user.id,
                "child_name": "複雑クエリテスト",
                "dog_name": "複雑犬",
                "care_clear_status": "active",
            }
        )

        # 複数のログを作成
        for i in range(3):
            await test_db.care_logs.create(
                data={
                    "care_setting_id": care_setting.id,
                    "date": f"2024-07-{i+1:02d}",
                    "fed_morning": i % 2 == 0,
                    "walk_result": i % 2 == 1,
                }
            )

        # 2. 複雑なクエリ実行
        result = await test_db.users.find_unique(
            where={"id": user.id},
            include={
                "care_settings": {
                    "include": {
                        "care_logs": {"take": 2, "order_by": {"date": "desc"}},
                        "reflection_notes": True,
                    }
                },
                "payment": True,
            },
        )

        # 3. 結果確認
        assert result is not None
        assert result.care_settings is not None
        assert len(result.care_settings) == 1
        assert result.care_settings[0].care_logs is not None
        assert len(result.care_settings[0].care_logs) == 2
        assert result.care_settings[0].care_logs[0].date == "2024-07-03"
