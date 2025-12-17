module.exports = function handleCreate(query) {
  const message = `Created item for request: ${query}`;
  return { intent: "create", message };
};

