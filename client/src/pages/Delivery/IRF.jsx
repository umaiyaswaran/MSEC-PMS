import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { deliveryApi, purchaseOrderApi } from '../../services/api';

export default function IRF() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [delivery, setDelivery] = useState(null);
  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inspectionData, setInspectionData] = useState({
    items: [],
    overallAssessment: '',
    inspectorSignature: '',
    inspectionDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const deliveryData = await deliveryApi.getDeliveryById(id);
      setDelivery(deliveryData);

      const poData = await purchaseOrderApi.getPOById(deliveryData.poId);
      setPo(poData);

      const items = poData.items?.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        condition: 'good',
        passFail: 'pass',
        remarks: '',
      })) || [];
      setInspectionData((prev) => ({ ...prev, items }));
    } catch (err) {
      setError(err.message || 'Failed to load inspection data');
    } finally {
      setLoading(false);
    }
  };

  const handleItemChange = (index, field, value) => {
    setInspectionData((prev) => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, items: newItems };
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const getConditionColor = (condition) => {
    const colors = {
      excellent: 'text-green-700',
      good: 'text-blue-700',
      fair: 'text-yellow-700',
      poor: 'text-red-700',
    };
    return colors[condition] || 'text-gray-700';
  };

  const getPassFailColor = (status) => {
    return status === 'pass' ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
          <button onClick={() => navigate(-1)} className="mt-2 text-sm text-red-600 underline">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!delivery || !po) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Print Controls */}
      <div className="no-print fixed top-0 left-0 right-0 bg-white border-b border-gray-200 p-4 z-10 flex justify-between items-center">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>
        <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print IRF
        </button>
      </div>

      {/* IRF Document */}
      <div className="print-document max-w-4xl mx-auto pt-20 pb-12 px-8 bg-white my-8 shadow-sm rounded-lg print:shadow-none print:rounded-none print:my-0">
        {/* Header */}
        <div className="text-center mb-8 border-b-2 border-gray-900 pb-6">
          <h1 className="text-2xl font-bold text-gray-900">INSPECTION REPORT FORM</h1>
          <p className="text-sm text-gray-600 mt-1">Quality Assurance Department</p>
        </div>

        {/* Report Info */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase border-b border-gray-300 pb-1">
              Delivery Information
            </h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Delivery Number:</span>
                <span className="font-medium">{delivery.deliveryNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Intent Request ID:</span>
                <span className="font-medium">{delivery.intentId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">PO Number:</span>
                <span className="font-medium">{po.poNumber}</span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase border-b border-gray-300 pb-1">
              Inspection Details
            </h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Inspection Date:</span>
                <span className="font-medium">{new Date(inspectionData.inspectionDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Supplier:</span>
                <span className="font-medium">{delivery.supplier?.name || po.supplier?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Inspector:</span>
                <span className="font-medium">{delivery.receivedBy || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Items Inspection Table */}
        <div className="mb-8">
          <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase border-b border-gray-300 pb-1">
            Items Inspection
          </h3>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 py-2 px-3 text-left font-bold">No.</th>
                <th className="border border-gray-300 py-2 px-3 text-left font-bold">Item Description</th>
                <th className="border border-gray-300 py-2 px-3 text-center font-bold">Quantity</th>
                <th className="border border-gray-300 py-2 px-3 text-center font-bold">Condition</th>
                <th className="border border-gray-300 py-2 px-3 text-center font-bold">Pass/Fail</th>
                <th className="border border-gray-300 py-2 px-3 text-left font-bold">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {inspectionData.items.map((item, index) => (
                <tr key={index}>
                  <td className="border border-gray-300 py-2 px-3">{index + 1}</td>
                  <td className="border border-gray-300 py-2 px-3 font-medium">{item.name}</td>
                  <td className="border border-gray-300 py-2 px-3 text-center">{item.quantity}</td>
                  <td className="border border-gray-300 py-2 px-3 text-center">
                    <span className={`capitalize ${getConditionColor(item.condition)}`}>
                      {item.condition}
                    </span>
                  </td>
                  <td className="border border-gray-300 py-2 px-3 text-center">
                    <span className={`uppercase ${getPassFailColor(item.passFail)}`}>
                      {item.passFail}
                    </span>
                  </td>
                  <td className="border border-gray-300 py-2 px-3">{item.remarks || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Overall Assessment */}
        <div className="mb-8">
          <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase border-b border-gray-300 pb-1">
            Overall Assessment
          </h3>
          <div className="p-4 border border-gray-300 rounded">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <span className="text-sm text-gray-600">Total Items Inspected:</span>
                <span className="ml-2 font-medium">{inspectionData.items.length}</span>
              </div>
              <div>
                <span className="text-sm text-gray-600">Items Passed:</span>
                <span className="ml-2 font-medium text-green-700">
                  {inspectionData.items.filter((i) => i.passFail === 'pass').length}
                </span>
              </div>
              <div>
                <span className="text-sm text-gray-600">Items Failed:</span>
                <span className="ml-2 font-medium text-red-700">
                  {inspectionData.items.filter((i) => i.passFail === 'fail').length}
                </span>
              </div>
              <div>
                <span className="text-sm text-gray-600">Delivery Condition:</span>
                <span className="ml-2 font-medium capitalize">{delivery.condition || 'N/A'}</span>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Inspector Notes</label>
              <p className="text-sm text-gray-600 border border-gray-200 rounded p-3 min-h-[60px]">
                {inspectionData.overallAssessment || delivery.conditionNotes || 'No additional notes provided.'}
              </p>
            </div>
          </div>
        </div>

        {/* Signature Section */}
        <div className="grid grid-cols-2 gap-12 mt-16">
          <div>
            <div className="border-t border-gray-400 pt-2">
              <p className="text-sm font-medium">Inspector Signature</p>
              <p className="text-xs text-gray-500 mt-1">Name: {delivery.receivedBy || '________________________'}</p>
              <p className="text-xs text-gray-500">Date: {new Date(inspectionData.inspectionDate).toLocaleDateString()}</p>
            </div>
          </div>
          <div>
            <div className="border-t border-gray-400 pt-2">
              <p className="text-sm font-medium">Approved by (Quality Manager)</p>
              <p className="text-xs text-gray-500 mt-1">Name: __________________________</p>
              <p className="text-xs text-gray-500">Signature: __________________________</p>
              <p className="text-xs text-gray-500">Date: __________________________</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
          <p>This is a computer-generated Inspection Report Form.</p>
          <p className="mt-1">IRF Reference: IRF-{delivery.deliveryNumber} | Generated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
