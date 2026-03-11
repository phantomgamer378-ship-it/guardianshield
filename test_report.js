
async function test() {
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
  });
  
  const loginData = await loginRes.json();
  const token = loginData.token;
  if (!token) {
    console.log("Login failed");
    // let's create a user if login fails
    const regRes = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: "Test User", email: 'test@example.com', phone: "000000000", password: 'password123' })
    });
    const regData = await regRes.json();
    if (!regData.token) {
        console.log("Reg failed", regData);
        return;
    }
  }
  
  const finalToken = token || (await (await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
  })).json()).token;

  const reportRes = await fetch('http://localhost:3000/api/report/community', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${finalToken}`
    },
    body: JSON.stringify({ 
      phoneNumber: '9876543210', 
      scamType: 'financial', 
      description: 'Test fraud' 
    })
  });
  
  const reportData = await reportRes.json();
  console.log(reportData);
}

test();
