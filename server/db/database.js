const { createClient } = require('@insforge/sdk');

// Use service role key for admin operations (bypasses RLS)
const serviceRoleClient = createClient({
    baseUrl: 'https://4eitrub9.ap-southeast.insforge.app',
    serviceKey: process.env.INSFORGE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im00aXRydWI5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA1MTgzMiwiZXhwIjoyMDg4NjI3ODMyfQ.QhTrkN5Cj_2J_0Q0d9a1kLxQ3zRzE7mYgZtFqXHnYc8'
});

// Use anon key for regular operations
const anonClient = createClient({
    baseUrl: 'https://4eitrub9.ap-southeast.insforge.app',
    anonKey: process.env.INSFORGE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNTE4MzJ9.Ydj6GKGNIUL7rf4uxCxoUTdKvfINpATORac9syKve3M'
});

// Export both clients for different use cases
module.exports = {
    serviceRole: serviceRoleClient,
    anon: anonClient,
    // Default to service role for backward compatibility
    default: serviceRoleClient,
    // Map database directly for controllers using `insforge.database.from()`
    database: serviceRoleClient.database
};
