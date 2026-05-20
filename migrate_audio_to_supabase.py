"""Migrate audio files từ backend/static/audio/ lên Supabase Storage.

Yêu cầu env (đặt trong backend/.env):
    SUPABASE_URL=https://xxx.supabase.co
    SUPABASE_SERVICE_KEY=eyJ...   (service_role key, KHÔNG dùng anon)
    SUPABASE_BUCKET=audios        (optional, mặc định 'audios')
    DATABASE_URL=...              (postgresql:// hoặc bỏ trống = sqlite local)

Chạy:
    cd backend && source venv/bin/activate
    cd .. && python migrate_audio_to_supabase.py

Idempotent: chạy lại sẽ skip file đã có URL Supabase.
"""
import os
import sys
import time
from pathlib import Path

ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT / "backend"))

from dotenv import load_dotenv
load_dotenv(ROOT / "backend" / ".env")

# Resolve DB path tuyệt đối — backend dùng sqlite:///./english_learning.db
# với CWD=backend, nên khi script chạy từ root phải set lại để trỏ đúng file.
if not os.environ.get("DATABASE_URL"):
    db_path = (ROOT / "backend" / "english_learning.db").resolve()
    os.environ["DATABASE_URL"] = f"sqlite:///{db_path}"

from models import SessionLocal, Audio  # noqa: E402
from supabase_client import upload_audio_bytes, is_configured  # noqa: E402


AUDIO_ROOT = ROOT / "backend"  # file_path lưu kiểu "static/audio/xxx.mp3" → relative to backend/


def main():
    if not is_configured():
        print("❌ Thiếu SUPABASE_URL / SUPABASE_SERVICE_KEY. Tạo backend/.env trước.")
        sys.exit(1)

    db = SessionLocal()
    try:
        audios = db.query(Audio).order_by(Audio.id).all()
        total = len(audios)
        print(f"📦 Tìm thấy {total} audio records trong DB")

        uploaded = 0
        skipped = 0
        failed = 0
        missing = 0

        for i, audio in enumerate(audios, 1):
            prefix = f"[{i}/{total}] id={audio.id}"
            fp = audio.file_path or ""

            if fp.startswith("http"):
                skipped += 1
                if i % 50 == 0:
                    print(f"{prefix} ⏭  đã có URL, skip")
                continue

            local_path = AUDIO_ROOT / fp
            if not local_path.exists():
                # thử với basename trong static/audio/
                alt = AUDIO_ROOT / "static" / "audio" / Path(fp).name
                if alt.exists():
                    local_path = alt
                else:
                    print(f"{prefix} ⚠️  file không tồn tại: {fp}")
                    missing += 1
                    continue

            try:
                data = local_path.read_bytes()
                public_url = upload_audio_bytes(local_path.name, data)
                audio.file_path = public_url
                db.add(audio)
                uploaded += 1
                if uploaded % 25 == 0:
                    db.commit()
                    print(f"{prefix} ✅ {local_path.name} ({uploaded} uploaded so far)")
                else:
                    print(f"{prefix} ✅ {local_path.name}")
            except Exception as e:
                failed += 1
                print(f"{prefix} ❌ {local_path.name}: {e}")
                # commit cái đã làm để không mất tiến độ
                db.commit()
                time.sleep(1)

        db.commit()
        print()
        print("=" * 60)
        print(f"Done. uploaded={uploaded}  skipped={skipped}  missing={missing}  failed={failed}")
        print("=" * 60)
    finally:
        db.close()


if __name__ == "__main__":
    main()
