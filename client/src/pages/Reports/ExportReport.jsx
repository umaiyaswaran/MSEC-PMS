import { useState } from 'react';
import reportApi from '../../api/reportApi';
import Button from '../../components/Buttons/Button';
import { showSuccess, showError } from '../../components/Notification/NotificationToast';

const REPORT_TYPES = [
  { value: 'procurement', label: 'Procurement Report', description: 'Detailed procurement data and analytics' },
  { value: 'supplier', label: 'Supplier Report', description: 'Supplier performance and spending analytics' },
  { value: 'invoice', label: 'Invoice Report', description: 'Invoice tracking and payment status' },
  { value: 'delivery', label: 'Delivery Report', description: 'Delivery tracking and performance' },
];

const FORMATS = [
  { value: 'PDF', label: 'PDF', description: 'Portable Document Format' },
  { value: 'Excel', label: 'Excel', description: 'Microsoft Excel Spreadsheet' },
  { value: 'CSV', label: 'CSV', description: 'Comma-Separated Values' },
];

const ExportReport = () => {
  const [config, setConfig] = useState({
    reportType: 'procurement',
    format: 'PDF',
    startDate: '',
    endDate: '',
    department: '',
    status: '',
  });
  const [generating, setGenerating] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);

  const handleChange = (e) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
    setDownloadUrl(null);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setDownloadUrl(null);
    try {
      const params = { format: config.format };
      if (config.startDate) params.startDate = config.startDate;
      if (config.endDate) params.endDate = config.endDate;
      if (config.department) params.department = config.department;
      if (config.status) params.status = config.status;

      const response = await reportApi.exportReport(config.reportType, params);
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      setDownloadUrl(url);
      showSuccess('Report generated successfully!');
    } catch (err) {
      showError('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!downloadUrl) return;
    const ext = config.format.toLowerCase();
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', `${config.reportType}-report.${ext}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Export Report</h1>
        <p className="mt-1 text-sm text-gray-600">Generate and download procurement reports.</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Report Configuration</h3>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Report Type</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {REPORT_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setConfig({ ...config, reportType: type.value })}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    config.reportType === type.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium text-gray-900">{type.label}</p>
                  <p className="text-xs text-gray-500 mt-1">{type.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Export Format</label>
            <div className="flex gap-3">
              {FORMATS.map((format) => (
                <button
                  key={format.value}
                  onClick={() => setConfig({ ...config, format: format.value })}
                  className={`px-4 py-3 border-2 rounded-lg text-center transition-all ${
                    config.format === format.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium text-gray-900">{format.label}</p>
                  <p className="text-xs text-gray-500">{format.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                name="startDate"
                value={config.startDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                name="endDate"
                value={config.endDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {config.reportType === 'procurement' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <select
                  name="department"
                  value={config.department}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Departments</option>
                  <option value="IT">IT</option>
                  <option value="Finance">Finance</option>
                  <option value="HR">HR</option>
                  <option value="Operations">Operations</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  name="status"
                  value={config.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 flex gap-3">
          <Button onClick={handleGenerate} loading={generating}>
            Generate Report
          </Button>
          {downloadUrl && (
            <Button variant="success" onClick={handleDownload}>
              Download Report
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportReport;
