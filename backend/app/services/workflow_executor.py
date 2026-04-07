import logging
import uuid
import asyncio
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.workflow import Workflow
from app.models.automation_log import AutomationLog
from app.models.message import Message
from app.services.message_hooks import register_handler

logger = logging.getLogger(__name__)

class WorkflowExecutor:
    def __init__(self):
        # Register for message reception to trigger workflows
        register_handler(self.trigger_workflows_on_message)

    async def trigger_workflows_on_message(self, db: AsyncSession, message: Message):
        """
        Entry point to find and start workflows based on a message received event.
        """
        conversation = message.conversation
        workspace_id = conversation.workspace_id if conversation else message.conversation_id # Fallback if not loaded
        
        # 1. Find workflows triggered by "message_received"
        result = await db.execute(
            select(Workflow)
            .where(
                Workflow.workspace_id == workspace_id,
                Workflow.trigger_type == "message_received",
                Workflow.is_active == True
            )
        )
        workflows = result.scalars().all()

        for workflow in workflows:
            # 2. Execute each matching workflow
            asyncio.create_task(self.execute_workflow(db, workflow, {"message": message}))

    async def execute_workflow(self, db: AsyncSession, workflow: Workflow, trigger_payload: Dict[str, Any]):
        """
        Executes a workflow graph. 
        Note: This usually runs in the background (as a task).
        """
        graph = workflow.graph
        nodes = graph.get("nodes", [])
        edges = graph.get("edges", [])
        
        logger.info(f"Executing workflow '{workflow.name}' ({workflow.id})")
        
        # In a real system, we'd do a topological sort or follow edges from the trigger node.
        # For the skeleton, we iterate through nodes sequentially or by simple edge traversal.
        
        context = {"payload": trigger_payload, "results": {}, "vars": {}}
        
        # Find trigger node
        current_nodes = [n for n in nodes if n.get("type") == "trigger"]
        
        visited = set()
        while current_nodes:
            next_nodes = []
            for node in current_nodes:
                if node["id"] in visited: continue
                visited.add(node["id"])
                
                # Execute Node
                result = await self.execute_node(db, node, context)
                context["results"][node["id"]] = result
                
                # Log execution in Audit Log
                await self.log_node_execution(db, workflow.workspace_id, workflow.id, node["id"], context, result)
                
                # Find connected nodes via edges
                # Filter edges starting from this node
                out_edges = [e for e in edges if e.get("from") == node["id"]]
                
                # Logic for branching (condition nodes)
                if node.get("type") == "condition":
                    # Condition nodes usually have two output ports (true/false)
                    branch = "true" if result.get("matched") else "false"
                    # Find edges linked to that specific branch/handle
                    for edge in out_edges:
                        if edge.get("out_handle") == branch:
                            target_node = next((n for n in nodes if n["id"] == edge["to"]), None)
                            if target_node: next_nodes.append(target_node)
                else:
                    # Sequential flow
                    for edge in out_edges:
                        target_node = next((n for n in nodes if n["id"] == edge["to"]), None)
                        if target_node: next_nodes.append(target_node)
            
            current_nodes = next_nodes

        # Update workflow stats
        workflow.last_run_at = datetime.now()
        workflow.run_count += 1
        await db.commit()

    async def log_node_execution(self, db: AsyncSession, workspace_id: uuid.UUID, workflow_id: uuid.UUID, node_id: str, context: Dict[str, Any], result: Dict[str, Any]):
        """
        Records the execution of a single node in a workflow.
        """
        log = AutomationLog(
            workspace_id=workspace_id,
            workflow_id=workflow_id,
            event_type="workflow_step",
            triggered_by="message",
            input_snapshot={"node_id": node_id, "context": context},
            result="executed",
            actions_executed=[{"node_id": node_id, "result": result}]
        )
        db.add(log)

    async def execute_node(self, db: AsyncSession, node: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        node_type = node.get("type")
        logger.debug(f"Executing node {node['id']} ({node_type})")
        
        # Node handlers
        if node_type == "trigger":
            return {"status": "triggered"}
        
        if node_type == "condition":
            # Logic to evaluate conditions from config
            return {"matched": True} # Mock
            
        if node_type == "ai_classify":
            # Call AI service
            return {"label": "refund_request"}
            
        if node_type == "send_message":
            # Logic to send message
            return {"status": "sent"}
            
        return {"status": "completed"}

workflow_executor = WorkflowExecutor()
