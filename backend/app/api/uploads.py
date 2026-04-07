from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
import os
import uuid
from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.core.config import get_settings

router = APIRouter(prefix="/api/v1/uploads", tags=["Uploads"])

@router.post("")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a file to the server.
    Returns the URL of the uploaded file.
    """
    settings = get_settings()
    upload_dir = "/app/uploads"
    
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir, exist_ok=True)
        
    # Generate unique filename
    ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{ext}"
    local_path = os.path.join(upload_dir, filename)
    
    try:
        with open(local_path, "wb") as f:
            f.write(await file.read())
            
        return {
            "url": f"{settings.BASE_URL}/uploads/{filename}",
            "filename": filename,
            "original_name": file.filename
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")
