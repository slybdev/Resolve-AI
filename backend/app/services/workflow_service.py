import re
from typing import Any, Dict, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.workflow import Workflow
from app.services.rule_engine import rule_engine

logger = logging.getLogger(__name__)

class WorkflowService:
    async def start_workflow(self, db: AsyncSession, workflow_id: uuid.UUID, event: Dict[str, Any]):
        """
        Starts a multi-step workflow.
        """
        result = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
        workflow = result.scalar_one_or_none()
        
        if not workflow or not workflow.is_active:
            return

        # Execute steps sequentially
        for step in workflow.steps:
            step_type = step.get("type")
            step_value = step.get("value")
            
            if step_type == "wait":
                duration = self.parse_duration(step.get("duration", "0"))
                # In a real system, we'd use a background task to resume.
                # For now, we'll just sleep if it's short, or log the limitation.
                if duration < 60:
                    await asyncio.sleep(duration)
                else:
                    logger.info(f"Workflow {workflow_id} waiting for {duration}s. (Background resumption TODO)")
                    break # Stop for now
            else:
                # Reuse RuleEngine's action execution for single steps
                await rule_engine.execute_actions(db, [step], event)

    def parse_duration(self, duration_str: str) -> int:
        """Parses '5m', '10s', etc. into seconds."""
        if not duration_str: return 0
        
        match = re.match(r"(\d+)([smh])", str(duration_str))
        if not match: return 0
        
        val, unit = int(match.group(1)), match.group(2)
        if unit == 's': return val
        if unit == 'm': return val * 60
        if unit == 'h': return val * 3600
        return 0

workflow_service = WorkflowService()
