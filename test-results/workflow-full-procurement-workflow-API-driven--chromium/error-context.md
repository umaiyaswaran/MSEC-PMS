# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workflow.spec.ts >> full procurement workflow (API-driven)
- Location: e2e\workflow.spec.ts:6:5

# Error details

```
Error: expect(received).toBeTruthy()

Received: false
```

# Test source

```ts
  29  |     data: {
  30  |       title: 'E2E Test Intent ' + Date.now(),
  31  |       description: 'Automated test intent',
  32  |       items: [{ name: 'Test Item', quantity: 1 }],
  33  |       department: departmentId,
  34  |       estimatedCost: 1000,
  35  |     },
  36  |   });
  37  |   expect(intentResp.ok()).toBeTruthy();
  38  |   const intentBody = await intentResp.json();
  39  |   const intentId = intentBody?.data?.intent?._id;
  40  |   expect(intentId).toBeTruthy();
  41  | 
  42  |   // Submit intent
  43  |   const submitResp = await request.put(`${API_BASE}/intents/${intentId}/submit`, { headers: requesterAuth });
  44  |   expect(submitResp.ok()).toBeTruthy();
  45  | 
  46  |   // 2) Manager approves the intent
  47  |   const managerAuth = await login('manager@msec.edu.in', 'msec@123');
  48  |   const approveResp = await request.put(`${API_BASE}/intents/${intentId}`, {
  49  |     headers: managerAuth,
  50  |     data: {
  51  |       managerApproval: { status: 'APPROVED', remarks: 'Approved by manager in E2E' },
  52  |       status: 'APPROVED',
  53  |     },
  54  |   });
  55  |   expect(approveResp.ok()).toBeTruthy();
  56  | 
  57  |   // 3) Manager uploads a quotation (acts as supplier/admin)
  58  |   const suppliersResp = await request.get(`${API_BASE}/suppliers/active`, { headers: managerAuth });
  59  |   expect(suppliersResp.ok()).toBeTruthy();
  60  |   const suppliersBody = await suppliersResp.json();
  61  |   const supplierId = suppliersBody?.data?.suppliers?.[0]?._id;
  62  |   expect(supplierId).toBeTruthy();
  63  | 
  64  |   const quotationResp = await request.post(`${API_BASE}/quotations`, {
  65  |     headers: managerAuth,
  66  |     data: {
  67  |       intent: intentId,
  68  |       supplier: supplierId,
  69  |       items: [{ name: 'Test Item', quantity: 1, unitPrice: 1000 }],
  70  |       totalAmount: 1000,
  71  |     },
  72  |   });
  73  |   expect(quotationResp.ok()).toBeTruthy();
  74  |   const quotationBody = await quotationResp.json();
  75  |   const quotationId = quotationBody?.data?.quotation?._id;
  76  |   expect(quotationId).toBeTruthy();
  77  | 
  78  |   // 4) Manager selects the quotation
  79  |   const selectResp = await request.put(`${API_BASE}/quotations/${quotationId}/select`, { headers: managerAuth });
  80  |   expect(selectResp.ok()).toBeTruthy();
  81  | 
  82  |   // 5) Manager creates a sample Purchase Order
  83  |   const poResp = await request.post(`${API_BASE}/purchase-orders`, {
  84  |     headers: managerAuth,
  85  |     data: {
  86  |       intent: intentId,
  87  |       supplier: supplierId,
  88  |       items: [{ name: 'Test Item', quantity: 1, unitPrice: 1000 }],
  89  |       totalAmount: 1000,
  90  |       type: 'SAMPLE',
  91  |       poType: 'NORMAL',
  92  |     },
  93  |   });
  94  |   expect(poResp.ok()).toBeTruthy();
  95  |   const poBody = await poResp.json();
  96  |   const poId = poBody?.data?.purchaseOrder?._id;
  97  |   expect(poId).toBeTruthy();
  98  | 
  99  |   // 6) Manager sends sample to admin (email) — API call
  100 |   const sendResp = await request.post(`${API_BASE}/purchase-orders/${poId}/send-sample-to-admin`, { headers: managerAuth });
  101 |   expect(sendResp.ok()).toBeTruthy();
  102 | 
  103 |   // 7) Admin approves the PO
  104 |   const adminAuth = await login('admin@msec.edu.in', 'msec@123');
  105 |   const approvePoResp = await request.put(`${API_BASE}/purchase-orders/${poId}/approve`, {
  106 |     headers: adminAuth,
  107 |     data: { remarks: 'Approved in E2E' },
  108 |   });
  109 |   expect(approvePoResp.ok()).toBeTruthy();
  110 | 
  111 |   // 8) Store manager creates a GRN for the PO — compute received quantity matching ordered
  112 |   const poDetailsResp = await request.get(`${API_BASE}/purchase-orders/${poId}`, { headers: adminAuth });
  113 |   expect(poDetailsResp.ok()).toBeTruthy();
  114 |   const poDetails = await poDetailsResp.json();
  115 |   const po = poDetails?.data?.purchaseOrder || poDetails?.purchaseOrder;
  116 |   expect(po).toBeTruthy();
  117 | 
  118 |   const grnItems = (po.items || []).map((it) => ({ name: it.name, receivedQuantity: it.quantity }));
  119 | 
  120 |   const storeAuth = await login('storemanager@msec.edu.in', 'msec@123');
  121 |   const grnResp = await request.post(`${API_BASE}/grns`, {
  122 |     headers: storeAuth,
  123 |     data: {
  124 |       purchaseOrderId: poId,
  125 |       items: grnItems,
  126 |       deliveryDate: new Date().toISOString(),
  127 |     },
  128 |   });
> 129 |   expect(grnResp.ok()).toBeTruthy();
      |                        ^ Error: expect(received).toBeTruthy()
  130 |   const grnBody = await grnResp.json();
  131 |   const grnId = grnBody?.data?.goodsReceiptNote?._id;
  132 |   expect(grnId).toBeTruthy();
  133 | 
  134 |   // 9) Verify PO status is COMPLETED
  135 |   const finalPoResp = await request.get(`${API_BASE}/purchase-orders/${poId}`, { headers: storeAuth });
  136 |   expect(finalPoResp.ok()).toBeTruthy();
  137 |   const finalPoBody = await finalPoResp.json();
  138 |   const finalPo = finalPoBody?.data?.purchaseOrder || finalPoBody?.purchaseOrder;
  139 |   expect(finalPo.status).toBeDefined();
  140 | 
  141 |   // Assert final PO status is APPROVED or COMPLETED depending on GRN
  142 |   expect(['APPROVED', 'COMPLETED', 'PARTIALLY_RECEIVED', 'CLOSED']).toContain(finalPo.status);
  143 | });
  144 | 
```