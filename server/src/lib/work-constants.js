export const VISIBLE_TASK_STAGES = [
  "accepted",
  "planned",
  "in_development",
  "testing",
  "completed",
];

export const TASK_STAGE_LABELS = {
  accepted: "Accepted",
  planned: "Planned",
  in_development: "In development",
  testing: "Testing",
  completed: "Completed",
  rejected: "Rejected",
};

export const APPROVAL_STATE_LABELS = {
  pending_approval: "Pending approval",
  approved_waiting_for_engineer: "Planning queued",
  approved: "Approved",
  not_required: "Direct engineer intake",
  rejected: "Rejected",
};

export const WORK_EVENT_TYPES = {
  taskCreated: "task.created",
  taskApproved: "task.approved",
  taskRejected: "task.rejected",
  taskTransitioned: "task.transitioned",
  taskUpdated: "task.updated",
  taskQueued: "task.engineer_queued",
  threadCreated: "thread.created",
  threadMessage: "thread.message",
  threadUpdated: "thread.updated",
};

export default {
  VISIBLE_TASK_STAGES,
  TASK_STAGE_LABELS,
  APPROVAL_STATE_LABELS,
  WORK_EVENT_TYPES,
};
