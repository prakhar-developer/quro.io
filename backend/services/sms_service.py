import logging
import re
import datetime
import httpx
from typing import Dict, Any
from config import settings

logger = logging.getLogger(__name__)

# Daily SMS Counter
_sms_daily_tracker: Dict[str, Any] = {
    "date": datetime.date.today(),
    "count": 0
}

def format_indian_phone_number(phone: str) -> str:
    """
    Format phone numbers cleanly to E.164 standard.
    Defaults to Indian country code (+91) if 10 digits provided.
    """
    cleaned = re.sub(r'[\s\-\(\)]', '', phone)
    
    if cleaned.startswith('+'):
        return cleaned
    
    if cleaned.startswith('91') and len(cleaned) == 12:
        return f"+{cleaned}"
        
    if len(cleaned) == 10 and cleaned.isdigit():
        return f"+91{cleaned}"
        
    return f"+{cleaned}"


def check_and_increment_daily_limit() -> bool:
    """
    Track daily SMS count to ensure it stays within the 100 free SIM SMS/day limit.
    """
    today = datetime.date.today()
    if _sms_daily_tracker["date"] != today:
        _sms_daily_tracker["date"] = today
        _sms_daily_tracker["count"] = 0
        
    if _sms_daily_tracker["count"] >= settings.MAX_DAILY_SMS_LIMIT:
        logger.warning(f"Daily SMS limit of {settings.MAX_DAILY_SMS_LIMIT} reached.")
        return False
        
    _sms_daily_tracker["count"] += 1
    return True


async def send_sms_otp(phone: str, otp: str) -> dict:
    """
    Send OTP SMS via httpSMS gateway or fallback to Dev Terminal logging.
    """
    formatted_phone = format_indian_phone_number(phone)
    message_text = f"Your Quro AI verification code is: {otp}. Valid for 5 minutes."

    # Dev/Fallback mode if API key or FROM number is not configured
    if not settings.HTTPSMS_API_KEY or not settings.HTTPSMS_FROM_NUMBER:
        print("\n" + "="*60)
        print(f" [MOBILE OTP DEV LOG] Phone: {formatted_phone} | OTP: {otp} ")
        print("="*60 + "\n")
        logger.info(f"[DEV MODE] OTP for {formatted_phone}: {otp}")
        return {"status": "success", "mode": "dev", "phone": formatted_phone, "message": "OTP logged in dev server console."}

    # Check daily free SMS limit
    if not check_and_increment_daily_limit():
        print(f"[LIMIT EXCEEDED] Daily SMS limit hit. Dev Fallback OTP: {otp} for {formatted_phone}")
        return {"status": "success", "mode": "dev_limit_reached", "phone": formatted_phone, "message": "Daily limit hit, OTP logged to console."}

    # API call to httpSMS
    endpoint = f"{settings.HTTPSMS_SERVER_URL.rstrip('/')}/v1/messages/send"
    headers = {
        "x-api-key": settings.HTTPSMS_API_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "content": message_text,
        "from": format_indian_phone_number(settings.HTTPSMS_FROM_NUMBER),
        "to": formatted_phone
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(endpoint, json=payload, headers=headers)
            
            if response.status_code in (200, 201):
                logger.info(f"SMS successfully sent to {formatted_phone} via httpSMS.")
                return {"status": "success", "mode": "httpsms", "phone": formatted_phone}
            else:
                logger.error(f"httpSMS failed ({response.status_code}): {response.text}")
                print(f"[httpSMS API ERROR] Status {response.status_code}. Fallback OTP: {otp} for {formatted_phone}")
                return {"status": "success", "mode": "dev_fallback", "phone": formatted_phone}
    except Exception as exc:
        logger.exception("Exception occurred while calling httpSMS API:")
        print(f"[httpSMS EXCEPTION] {exc}. Fallback OTP: {otp} for {formatted_phone}")
        return {"status": "success", "mode": "dev_fallback", "phone": formatted_phone}
