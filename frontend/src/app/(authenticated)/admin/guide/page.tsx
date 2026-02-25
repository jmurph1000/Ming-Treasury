'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsApi } from '@/lib/api';
import {
  BookOpen,
  Save,
  Eye,
  Edit3,
  Clock,
  User,
  History,
  Loader2,
  CheckCircle,
  AlertCircle,
  Send,
  Printer,
  X,
  Mail,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function AdminUserGuidePage() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [showVersions, setShowVersions] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendEmail, setSendEmail] = useState('');
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['document', 'user-guide'],
    queryFn: () => documentsApi.get('user-guide'),
  });

  const { data: versionsData } = useQuery({
    queryKey: ['document-versions', 'user-guide'],
    queryFn: () => documentsApi.getVersions('user-guide'),
    enabled: showVersions,
  });

  const document = data?.data;
  const versions = versionsData?.data || [];

  const saveMutation = useMutation({
    mutationFn: () => documentsApi.update('user-guide', {
      title: editTitle,
      content: editContent,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document', 'user-guide'] });
      queryClient.invalidateQueries({ queryKey: ['document-versions', 'user-guide'] });
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const handleStartEdit = () => {
    setEditContent(document?.content || '');
    setEditTitle(document?.title || 'User Guide');
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditContent(document?.content || '');
    setEditTitle(document?.title || 'User Guide');
    setIsEditing(false);
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>User Guide - Gusto Treasury</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              max-width: 800px;
              margin: 0 auto;
              padding: 40px 20px;
              color: #333;
            }
            h1 { font-size: 24px; margin-bottom: 8px; }
            h2 { font-size: 20px; margin-top: 24px; color: #1a365d; }
            h3 { font-size: 16px; margin-top: 16px; }
            p { margin: 12px 0; }
            ul, ol { margin: 12px 0; padding-left: 24px; }
            li { margin: 6px 0; }
            table { border-collapse: collapse; width: 100%; margin: 16px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #f5f5f5; }
            code { background: #f5f5f5; padding: 2px 4px; border-radius: 3px; font-size: 14px; }
            .header { border-bottom: 2px solid #1a365d; padding-bottom: 16px; margin-bottom: 24px; }
            .meta { color: #666; font-size: 14px; }
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${document?.title || 'User Guide'}</h1>
            <div class="meta">
              Version ${document?.version} | Last updated: ${document?.updated_at ? new Date(document.updated_at).toLocaleDateString() : 'N/A'}
              ${document?.updated_by_name ? ` | By: ${document.updated_by_name}` : ''}
            </div>
          </div>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const sendMutation = useMutation({
    mutationFn: (email: string) => documentsApi.send('user-guide', email),
    onSuccess: () => {
      setSendSuccess(true);
      setSendError('');
      setTimeout(() => {
        setShowSendModal(false);
        setSendEmail('');
        setSendSuccess(false);
      }, 2000);
    },
    onError: (error: any) => {
      setSendError(error.message || 'Failed to send guide');
    },
  });

  const handleSendGuide = async () => {
    if (!sendEmail || !sendEmail.includes('@')) {
      setSendError('Please enter a valid email address');
      return;
    }

    sendMutation.mutate(sendEmail);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Notification */}
      {saveSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg flex items-center gap-3 animate-in">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <p className="text-green-800 font-medium">User Guide saved successfully (Version {document?.version})</p>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Guide Management</h1>
          <p className="text-gray-500 mt-1">
            View, edit, and share the user guide with team members.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowVersions(!showVersions)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <History className="h-4 w-4" />
            History
          </button>
          <button
            onClick={() => setShowSendModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Send className="h-4 w-4" />
            Send to User
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Printer className="h-4 w-4" />
            Print / PDF
          </button>
          {!isEditing ? (
            <button
              onClick={handleStartEdit}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Edit3 className="h-4 w-4" />
              Edit Guide
            </button>
          ) : (
            <>
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Changes
              </button>
            </>
          )}
        </div>
      </div>

      {/* Version Info */}
      {document && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-blue-800">
              <BookOpen className="h-4 w-4" />
              <span>Current Version: <strong>{document.version}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-blue-700">
              <Clock className="h-4 w-4" />
              <span>Last Updated: {new Date(document.updated_at).toLocaleString()}</span>
            </div>
            {document.updated_by_name && (
              <div className="flex items-center gap-2 text-blue-700">
                <User className="h-4 w-4" />
                <span>By: {document.updated_by_name}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Version History Panel */}
      {showVersions && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b">
            <h3 className="font-semibold text-gray-900">Version History</h3>
          </div>
          <div className="divide-y max-h-64 overflow-y-auto">
            {versions.length === 0 ? (
              <div className="px-6 py-4 text-gray-500 text-sm">
                No previous versions available.
              </div>
            ) : (
              versions.map((version: any) => (
                <div key={version.id} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50">
                  <div>
                    <span className="font-medium text-gray-900">Version {version.version}</span>
                    <span className="text-gray-500 text-sm ml-3">
                      {new Date(version.updated_at).toLocaleString()}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    By: {version.updated_by_name || 'Unknown'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {isEditing ? (
        /* Editor Mode - Side by Side */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50 flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-gray-500" />
              <span className="font-medium text-gray-700">Edit (Markdown)</span>
            </div>
            <div className="p-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full h-[500px] font-mono text-sm p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Enter markdown content..."
              />
            </div>
          </div>

          {/* Preview */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50 flex items-center gap-2">
              <Eye className="h-4 w-4 text-gray-500" />
              <span className="font-medium text-gray-700">Preview</span>
            </div>
            <div className="p-4 h-[560px] overflow-y-auto">
              <article className="prose prose-sm prose-slate max-w-none
                prose-headings:font-bold prose-headings:text-gray-900
                prose-h1:text-xl prose-h2:text-lg prose-h2:text-[#0a5c36] prose-h3:text-base
                prose-p:text-gray-600 prose-li:text-gray-600
                prose-table:border prose-table:border-gray-200
                prose-thead:bg-gray-50
                prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:font-semibold prose-th:border-b
                prose-td:px-3 prose-td:py-2 prose-td:border-b prose-td:border-gray-100
              ">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{editContent}</ReactMarkdown>
              </article>
            </div>
          </div>
        </div>
      ) : (
        /* View Mode - Full Width */
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <span className="font-semibold text-gray-900">{document?.title || 'User Guide'}</span>
          </div>
          <div className="p-8" ref={printRef}>
            <article className="prose prose-slate max-w-none
              prose-headings:font-bold prose-headings:text-gray-900
              prose-h1:text-2xl prose-h1:border-b prose-h1:pb-2 prose-h1:mb-4
              prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:text-[#0a5c36]
              prose-h3:text-lg prose-h3:mt-6
              prose-p:text-gray-600 prose-p:leading-relaxed
              prose-li:text-gray-600 prose-li:my-1
              prose-strong:text-gray-900 prose-strong:font-semibold
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-table:border prose-table:border-gray-200 prose-table:rounded-lg
              prose-thead:bg-gray-50
              prose-th:px-4 prose-th:py-2 prose-th:text-left prose-th:font-semibold prose-th:text-gray-900 prose-th:border-b
              prose-td:px-4 prose-td:py-2 prose-td:border-b prose-td:border-gray-100
              prose-tr:even:bg-gray-50
              prose-hr:my-8 prose-hr:border-gray-200
            ">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{document?.content || ''}</ReactMarkdown>
            </article>
          </div>
        </div>
      )}

      {/* Info Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-medium">Audit Trail</p>
          <p className="mt-1">
            All changes to the User Guide are logged in the audit trail with version number, timestamp, and editor name.
            Previous versions are preserved and can be viewed in the version history.
          </p>
        </div>
      </div>

      {/* Send to User Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-semibold text-gray-900">Send User Guide</h3>
              <button
                onClick={() => {
                  setShowSendModal(false);
                  setSendEmail('');
                  setSendError('');
                  setSendSuccess(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              {sendSuccess ? (
                <div className="text-center py-4">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <p className="text-green-800 font-medium">User Guide sent successfully!</p>
                  <p className="text-gray-500 text-sm mt-1">An email has been sent to {sendEmail}</p>
                </div>
              ) : (
                <>
                  <p className="text-gray-600 text-sm mb-4">
                    Enter an email address to send the current User Guide directly to a team member.
                  </p>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="email"
                        value={sendEmail}
                        onChange={(e) => {
                          setSendEmail(e.target.value);
                          setSendError('');
                        }}
                        placeholder="user@gusto.com"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    {sendError && (
                      <p className="text-red-600 text-sm mt-1">{sendError}</p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowSendModal(false);
                        setSendEmail('');
                        setSendError('');
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSendGuide}
                      disabled={sendMutation.isPending}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {sendMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      {sendMutation.isPending ? 'Sending...' : 'Send Guide'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
