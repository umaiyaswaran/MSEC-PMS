import { test, expect } from '@playwright/test';

const API_BASE = process.env.API_BASE || 'http://localhost:5000/api';

test('create sample PO and send to admin', async ({ request }) => {
  async function login(email: string, password: string) {
    const resp = await request.post(`${API_BASE}/auth/login`, { data: { email, password } });
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    const token = body?.data?.token || body?.token;
    return { Authorization: `Bearer ${token}` };
  }

  // Use existing seeded users and supplier
  const requesterAuth = await login('user1@msec.edu.in', 'msec@123');

  // create an intent (minimal)
  const deps = await request.get(`${API_BASE}/departments`, { headers: requesterAuth });
  expect(deps.ok()).toBeTruthy();
  const depsBody = await deps.json();
  const departmentId = depsBody?.data?.departments?.[0]?._id;
  expect(departmentId).toBeTruthy();

  const intentResp = await request.post(`${API_BASE}/intents`, {
    headers: requesterAuth,
    data: {
      title: 'SamplePO Test Intent ' + Date.now(),
      description: 'Intent created for sample PO test',
      items: [{ name: 'Item A', quantity: 2 }],
      department: departmentId,
    },
  });
  expect(intentResp.ok()).toBeTruthy();
  const intentBody = await intentResp.json();
  const intentId = intentBody?.data?.intent?._id;
  expect(intentId).toBeTruthy();

  // submit intent
  const submitResp = await request.put(`${API_BASE}/intents/${intentId}/submit`, { headers: requesterAuth });
  expect(submitResp.ok()).toBeTruthy();

  // manager approves
  const managerAuth = await login('manager@msec.edu.in', 'msec@123');
  const approveResp = await request.put(`${API_BASE}/intents/${intentId}`, {
    headers: managerAuth,
    data: { managerApproval: { status: 'APPROVED', remarks: 'E2E manager approval' }, status: 'APPROVED' },
  });
  expect(approveResp.ok()).toBeTruthy();

  // pick a supplier
  const suppliersResp = await request.get(`${API_BASE}/suppliers/active`, { headers: managerAuth });
  expect(suppliersResp.ok()).toBeTruthy();
  const suppliers = await suppliersResp.json();
  const supplierId = suppliers?.data?.suppliers?.[0]?._id;
  expect(supplierId).toBeTruthy();

  // create sample PO
  const poResp = await request.post(`${API_BASE}/purchase-orders`, {
    headers: managerAuth,
    data: {
      intent: intentId,
      supplier: supplierId,
      items: [{ name: 'Item A', quantity: 2, unitPrice: 500 }],
      totalAmount: 1000,
      type: 'SAMPLE',
      poType: 'NORMAL',
    },
  });

  if (!poResp.ok()) {
    const body = await poResp.json().catch(() => ({}));
    console.error('Create PO failed', poResp.status(), body);
  }
  expect(poResp.ok()).toBeTruthy();
  const poBody = await poResp.json();
  const poId = poBody?.data?.purchaseOrder?._id;
  expect(poId).toBeTruthy();

  // send sample PO to admin
  const sendResp = await request.post(`${API_BASE}/purchase-orders/${poId}/send-sample-to-admin`, { headers: managerAuth });
  if (!sendResp.ok()) {
    const body = await sendResp.json().catch(() => ({}));
    console.error('Send sample to admin failed', sendResp.status(), body);
  }
  expect(sendResp.ok()).toBeTruthy();
  const sendBody = await sendResp.json();
  expect(sendBody?.success).toBeTruthy();
});
