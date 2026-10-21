from app.core.config import Settings
from app.integrations.ai_core.hmm_adapter import HMMArtifactAdapter
from app.integrations.ai_core.schemas import AICoreHealth


async def check_ai_core_health(settings: Settings) -> AICoreHealth:
    return await HMMArtifactAdapter(settings).health_check()
