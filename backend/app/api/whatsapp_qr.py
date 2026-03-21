from fastapi import APIRouter, Depends, HTTPException
import httpx
import logging

from app.core.dependencies import get_current_user
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/whatsapp-qr", tags=["WhatsApp QR"])

# Internal URL for the Node.js bridge in Docker
BRIDGE_URL = "http://whatsapp-service:3001"

@router.get("/qr")
async def get_whatsapp_qr(current_user: User = Depends(get_current_user)):
    """
    Fetches the current QR code from the WhatsApp Node.js bridge.
    """
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{BRIDGE_URL}/qr", timeout=5.0)
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"WhatsApp bridge returned error: {response.text}")
                return {"status": "error", "message": "Failed to fetch QR code from bridge"}
        except Exception as e:
            logger.error(f"Error connecting to WhatsApp bridge: {str(e)}")
            return {"status": "waiting", "message": "WhatsApp bridge is starting or unreachable"}

@router.get("/status")
async def get_whatsapp_status(current_user: User = Depends(get_current_user)):
    """
    Checks the connection status of the WhatsApp bridge.
    """
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{BRIDGE_URL}/status", timeout=5.0)
            return response.json()
        except Exception as e:
            logger.error(f"Error checking WhatsApp bridge status: {str(e)}")
            return {"state": "close", "authenticated": False}

@router.post("/logout")
async def logout_whatsapp(current_user: User = Depends(get_current_user)):
    """
    Logs out the WhatsApp session from the bridge.
    """
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(f"{BRIDGE_URL}/logout", timeout=5.0)
            return response.json()
        except Exception as e:
            logger.error(f"Error logging out WhatsApp: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to communicate with WhatsApp bridge")

@router.post("/clear")
async def clear_whatsapp_session(current_user: User = Depends(get_current_user)):
    """
    Clears the WhatsApp session files and restarts the bridge connection.
    """
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(f"{BRIDGE_URL}/clear-session", timeout=10.0)
            return response.json()
        except Exception as e:
            logger.error(f"Error clearing WhatsApp session: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to communicate with WhatsApp bridge")
