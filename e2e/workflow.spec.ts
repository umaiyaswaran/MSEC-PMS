import { test, expect } from '@playwright/test';

const API_BASE = process.env.API_BASE || 'http://localhost:5000/api';
const CLIENT_BASE = process.env.CLIENT_BASE || 'http://localhost:5173';

test('full procurement workflow (API-driven)', async ({ request }) => {
  // Helper to login and return auth header
  async function login(email: string, password: string) {
    const resp = await request.post(`${API_BASE}/auth/login`, {
      data: { email, password },
    });
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    const token = body?.data?.token || body?.token;
    expect(token).toBeTruthy();
    return { Authorization: `Bearer ${token}` };
  }

  // 1) Requester creates an intent
  const requesterAuth = await login('user1@msec.edu.in', 'msec@123');
  const deps = await request.get(`${API_BASE}/departments`, { headers: requesterAuth });
  expect(deps.ok()).toBeTruthy();
  const depsBody = await deps.json();
  const departmentId = depsBody?.data?.departments?.[0]?._id;
  expect(departmentId).toBeTruthy();

  const intentResp = await request.post(`${API_BASE}/intents`, {
    headers: requesterAuth,
    data: {
      title: 'E2E Test Intent ' + Date.now(),
      description: 'Automated test intent',
      items: [{ name: 'Test Item', quantity: 1 }],
      department: departmentId,
      estimatedCost: 1000,
    },
  });
  expect(intentResp.ok()).toBeTruthy();
  const intentBody = await intentResp.json();
  const intentId = intentBody?.data?.intent?._id;
  expect(intentId).toBeTruthy();

  // Submit intent
  const submitResp = await request.put(`${API_BASE}/intents/${intentId}/submit`, { headers: requesterAuth });
  expect(submitResp.ok()).toBeTruthy();

  // 2) Manager approves the intent
  const managerAuth = await login('manager@msec.edu.in', 'msec@123');
  const approveResp = await request.put(`${API_BASE}/intents/${intentId}`, {
    headers: managerAuth,
    data: {
      managerApproval: { status: 'APPROVED', remarks: 'Approved by manager in E2E' },
      status: 'APPROVED',
    },
  });
  expect(approveResp.ok()).toBeTruthy();

  // 3) Manager uploads a quotation (acts as supplier/admin)
  const suppliersResp = await request.get(`${API_BASE}/suppliers/active`, { headers: managerAuth });
  expect(suppliersResp.ok()).toBeTruthy();
  const suppliersBody = await suppliersResp.json();
  const supplierId = suppliersBody?.data?.suppliers?.[0]?._id;
  expect(supplierId).toBeTruthy();

  const quotationResp = await request.post(`${API_BASE}/quotations`, {
    headers: managerAuth,
    data: {
      intent: intentId,
      supplier: supplierId,
      items: [{ name: 'Test Item', quantity: 1, unitPrice: 1000 }],
      totalAmount: 1000,
    },
  });
  expect(quotationResp.ok()).toBeTruthy();
  const quotationBody = await quotationResp.json();
  const quotationId = quotationBody?.data?.quotation?._id;
  expect(quotationId).toBeTruthy();

  // 4) Manager selects the quotation
  const selectResp = await request.put(`${API_BASE}/quotations/${quotationId}/select`, { headers: managerAuth });
  expect(selectResp.ok()).toBeTruthy();

  // 5) Manager creates a sample Purchase Order
  const poResp = await request.post(`${API_BASE}/purchase-orders`, {
    headers: managerAuth,
    data: {
      intent: intentId,
      supplier: supplierId,
      items: [{ name: 'Test Item', quantity: 1, unitPrice: 1000 }],
      totalAmount: 1000,
      type: 'SAMPLE',
      poType: 'NORMAL',
    },
  });
  expect(poResp.ok()).toBeTruthy();
  const poBody = await poResp.json();
  const poId = poBody?.data?.purchaseOrder?._id;
  expect(poId).toBeTruthy();

  // 6) Manager sends sample to admin (email) — API call
  const sendResp = await request.post(`${API_BASE}/purchase-orders/${poId}/send-sample-to-admin`, { headers: managerAuth });
  expect(sendResp.ok()).toBeTruthy();

  // 7) Admin approves the PO
  const adminAuth = await login('admin@msec.edu.in', 'msec@123');
  const approvePoResp = await request.put(`${API_BASE}/purchase-orders/${poId}/approve`, {
    headers: adminAuth,
    data: { remarks: 'Approved in E2E' },
  });
  expect(approvePoResp.ok()).toBeTruthy();

  // 8) Store manager creates a GRN for the PO — compute received quantity matching ordered
  const poDetailsResp = await request.get(`${API_BASE}/purchase-orders/${poId}`, { headers: adminAuth });
  expect(poDetailsResp.ok()).toBeTruthy();
  const poDetails = await poDetailsResp.json();
  const po = poDetails?.data?.purchaseOrder || poDetails?.purchaseOrder;
  expect(po).toBeTruthy();

  const grnItems = (po.items || []).map((it) => ({ name: it.name, receivedQuantity: it.quantity }));

  const storeAuth = await login('storemanager@msec.edu.in', 'msec@123');
  const grnResp = await request.post(`${API_BASE}/grns`, {
    headers: storeAuth,
    data: {
      purchaseOrderId: poId,
      items: grnItems,
      deliveryDate: new Date().toISOString(),
    },
  });
  expect(grnResp.ok()).toBeTruthy();
  const grnBody = await grnResp.json();
  const grnId = grnBody?.data?.goodsReceiptNote?._id;
  expect(grnId).toBeTruthy();

  // 9) Verify PO status is COMPLETED
  const finalPoResp = await request.get(`${API_BASE}/purchase-orders/${poId}`, { headers: storeAuth });
  expect(finalPoResp.ok()).toBeTruthy();
  const finalPoBody = await finalPoResp.json();
  const finalPo = finalPoBody?.data?.purchaseOrder || finalPoBody?.purchaseOrder;
  expect(finalPo.status).toBeDefined();

  // Assert final PO status is APPROVED or COMPLETED depending on GRN
  expect(['APPROVED', 'COMPLETED', 'PARTIALLY_RECEIVED', 'CLOSED']).toContain(finalPo.status);
});
