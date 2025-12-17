module.exports = function handleSchedule(query) {
  const message = `Scheduled item for request: ${query}`;
  return { intent: "schedule", message };
};

