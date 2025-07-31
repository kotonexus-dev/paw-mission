-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "firebase_uid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "current_plan" TEXT,
    "is_verified" BOOLEAN,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_settings" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "parent_name" TEXT,
    "child_name" TEXT,
    "dog_name" TEXT,
    "care_start_date" TIMESTAMP(3),
    "care_end_date" TIMESTAMP(3),
    "morning_meal_time" TIMESTAMP(3),
    "night_meal_time" TIMESTAMP(3),
    "walk_time" TIMESTAMP(3),
    "care_password" TEXT,
    "care_clear_status" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "care_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_logs" (
    "id" SERIAL NOT NULL,
    "care_setting_id" INTEGER NOT NULL,
    "date" TIMESTAMP(3),
    "fed_morning" BOOLEAN,
    "fed_night" BOOLEAN,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "care_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reflection_notes" (
    "id" SERIAL NOT NULL,
    "care_setting_id" INTEGER NOT NULL,
    "content" TEXT,
    "approved_by_parent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "reflection_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_logs" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT,
    "is_llm_based" BOOLEAN,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "walk_missions" (
    "id" SERIAL NOT NULL,
    "care_log_id" INTEGER NOT NULL,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "total_distance_m" INTEGER,
    "result" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "walk_missions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "firebase_uid" TEXT,
    "stripe_session_id" TEXT NOT NULL,
    "stripe_payment_intent_id" TEXT,
    "stripe_charge_id" TEXT,
    "amount" INTEGER,
    "currency" TEXT,
    "status" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "event_type" TEXT,
    "stripe_session_id" TEXT,
    "stripe_payment_intent_id" TEXT,
    "customer_email" TEXT,
    "amount" INTEGER,
    "currency" TEXT,
    "payment_status" TEXT,
    "payload" JSONB,
    "received_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "error_message" TEXT,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_firebase_uid_key" ON "users"("firebase_uid");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "payment_stripe_session_id_key" ON "payment"("stripe_session_id");

-- AddForeignKey
ALTER TABLE "care_settings" ADD CONSTRAINT "care_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_logs" ADD CONSTRAINT "care_logs_care_setting_id_fkey" FOREIGN KEY ("care_setting_id") REFERENCES "care_settings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reflection_notes" ADD CONSTRAINT "reflection_notes_care_setting_id_fkey" FOREIGN KEY ("care_setting_id") REFERENCES "care_settings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_logs" ADD CONSTRAINT "message_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "walk_missions" ADD CONSTRAINT "walk_missions_care_log_id_fkey" FOREIGN KEY ("care_log_id") REFERENCES "care_logs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
