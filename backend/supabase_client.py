"""Supabase Storage client cho upload audio files."""
import os
import re
from typing import Optional

from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")
SUPABASE_BUCKET = os.environ.get("SUPABASE_BUCKET", "audios")

_client: Optional[Client] = None


def get_supabase() -> Client:
    """Lazy init Supabase client. Raise nếu chưa config env."""
    global _client
    if _client is None:
        if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
            raise RuntimeError(
                "Thiếu SUPABASE_URL / SUPABASE_SERVICE_KEY trong env. "
                "Tạo file backend/.env và set 2 biến này."
            )
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return _client


def is_configured() -> bool:
    return bool(SUPABASE_URL and SUPABASE_SERVICE_KEY)


def sanitize_filename(filename: str) -> str:
    """Chuyển tên file thành dạng an toàn cho object key trên Supabase.
    Giữ extension, thay khoảng trắng và ký tự đặc biệt thành '_'.
    """
    name, ext = os.path.splitext(filename)
    name = re.sub(r"[^A-Za-z0-9._-]+", "_", name).strip("_")
    return f"{name}{ext.lower()}"


CONTENT_TYPES = {
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
    ".ogg": "audio/ogg",
    ".webm": "audio/webm",
}


def upload_audio_bytes(filename: str, data: bytes) -> str:
    """Upload audio bytes lên Supabase Storage và trả về public URL.
    Dùng upsert để re-upload không lỗi (idempotent).
    """
    client = get_supabase()
    key = sanitize_filename(filename)
    ext = os.path.splitext(key)[1].lower()
    content_type = CONTENT_TYPES.get(ext, "application/octet-stream")

    client.storage.from_(SUPABASE_BUCKET).upload(
        path=key,
        file=data,
        file_options={
            "content-type": content_type,
            "upsert": "true",
        },
    )
    return client.storage.from_(SUPABASE_BUCKET).get_public_url(key)


def delete_audio_by_url(public_url: str) -> None:
    """Xóa file trên Supabase dựa vào public URL đã lưu trong DB.
    Bỏ qua silently nếu URL không khớp bucket hiện tại.
    """
    if not public_url or "/storage/v1/object/public/" not in public_url:
        return
    try:
        key = public_url.split(f"/public/{SUPABASE_BUCKET}/", 1)[1].split("?", 1)[0]
    except IndexError:
        return
    client = get_supabase()
    client.storage.from_(SUPABASE_BUCKET).remove([key])
