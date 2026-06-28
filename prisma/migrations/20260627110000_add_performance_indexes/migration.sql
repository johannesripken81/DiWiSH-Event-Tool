CREATE INDEX "Event_eventLeadId_eventDate_idx" ON "Event"("eventLeadId", "eventDate");

CREATE INDEX "EventParticipant_eventId_name_idx" ON "EventParticipant"("eventId", "name");

CREATE INDEX "EventTask_eventId_dueDate_status_idx" ON "EventTask"("eventId", "dueDate", "status");

CREATE INDEX "EventTask_eventId_responsibleUserId_status_idx" ON "EventTask"("eventId", "responsibleUserId", "status");
