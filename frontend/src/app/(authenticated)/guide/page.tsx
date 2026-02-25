'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { documentsApi } from '@/lib/api';
import { useIsAdmin } from '@/hooks/useAuth';
import { ROUTES } from '@/lib/constants';
import { BookOpen, Clock, User, Loader2, Edit3 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function UserGuidePage() {
  const isAdmin = useIsAdmin();

  const { data, isLoading, error } = useQuery({
    queryKey: ['document', 'user-guide'],
    queryFn: () => documentsApi.get('user-guide'),
  });

  const document = data?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !document || !document.content) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900">User Guide Coming Soon</h3>
        <p className="text-gray-500 mt-1">
          The user guide is being prepared. Contact{' '}
          <a href="mailto:treasury-admin@gusto.com" className="text-primary hover:underline">
            treasury-admin@gusto.com
          </a>{' '}
          for assistance.
        </p>
        {isAdmin && (
          <Link
            href={ROUTES.ADMIN_GUIDE}
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Edit3 className="h-4 w-4" />
            Create User Guide
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{document.title}</h1>
          </div>
          {isAdmin && (
            <Link
              href={ROUTES.ADMIN_GUIDE}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Edit3 className="h-4 w-4" />
              Edit Guide
            </Link>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Last updated: {new Date(document.updated_at).toLocaleDateString()}
          </span>
          {document.updated_by_name && (
            <span className="flex items-center gap-1">
              <User className="h-4 w-4" />
              By: {document.updated_by_name}
            </span>
          )}
          <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
            Version {document.version}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-sm border p-8">
        <article className="prose prose-slate max-w-none
          prose-headings:font-bold prose-headings:text-gray-900
          prose-h1:text-2xl prose-h1:border-b prose-h1:pb-2 prose-h1:mb-4
          prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:text-[#0a5c36]
          prose-h3:text-lg prose-h3:mt-6
          prose-p:text-gray-600 prose-p:leading-relaxed
          prose-li:text-gray-600 prose-li:my-1
          prose-strong:text-gray-900 prose-strong:font-semibold
          prose-a:text-primary prose-a:no-underline hover:prose-a:underline
          prose-table:border prose-table:border-gray-200 prose-table:rounded-lg prose-table:overflow-hidden
          prose-thead:bg-gray-50
          prose-th:px-4 prose-th:py-2 prose-th:text-left prose-th:font-semibold prose-th:text-gray-900 prose-th:border-b prose-th:border-gray-200
          prose-td:px-4 prose-td:py-2 prose-td:border-b prose-td:border-gray-100
          prose-tr:even:bg-gray-50
          prose-hr:my-8 prose-hr:border-gray-200
          prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
          prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-gray-50 prose-blockquote:py-2
        ">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {document.content}
          </ReactMarkdown>
        </article>
      </div>

      {/* Footer */}
      <div className="mt-6 text-center text-sm text-gray-500">
        <p>
          Questions about this guide? Contact{' '}
          <a href="mailto:treasury-admin@gusto.com" className="text-primary hover:underline">
            treasury-admin@gusto.com
          </a>
        </p>
      </div>
    </div>
  );
}
