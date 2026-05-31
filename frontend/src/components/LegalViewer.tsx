import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface LegalViewerProps {
  appType: 'customer' | 'seller' | 'delivery';
  docType: 'policy' | 'terms' | 'support';
}

export default function LegalViewer({ appType, docType }: LegalViewerProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const response = await fetch(`${API_URL}/api/v1/app-settings`);
        const result = await response.json();
        
        if (result.success && result.data) {
          if (docType === 'policy') {
            setContent(result.data.appPolicies?.[appType] || 'Policy content not available.');
          } else if (docType === 'terms') {
            setContent(result.data.appTerms?.[appType] || 'Terms content not available.');
          } else if (docType === 'support') {
            setContent(result.data.appSupport?.[appType] || 'Support information not available.');
          }
        }
      } catch (err) {
        console.error(`Failed to fetch ${docType} for ${appType}`, err);
        setContent('Error loading content. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [appType, docType]);

  const getTitle = () => {
    const appTitle = appType.charAt(0).toUpperCase() + appType.slice(1);
    const docTitle = docType === 'policy' ? 'Privacy Policy' : docType === 'terms' ? 'Terms & Conditions' : 'Support';
    return `${appTitle} App ${docTitle}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900">{getTitle()}</h3>
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm leading-4 font-medium rounded-md text-teal-700 bg-teal-100 hover:bg-teal-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
            >
              Go Back
            </button>
          </div>
          <div className="px-4 py-5 sm:p-6 text-sm text-gray-700">
            {loading ? (
              <div className="flex justify-center p-8">
                <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="prose max-w-none whitespace-pre-wrap font-sans">
                {content}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
