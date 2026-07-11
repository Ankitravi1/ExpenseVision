import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { ImportWizard } from '../components/importExport/ImportWizard';
import { ExportPanel } from '../components/importExport/ExportPanel';

type Section = 'import' | 'export';

export const ImportExportPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();

    const section: Section = searchParams.get('section') === 'export' ? 'export' : 'import';
    const initialStartDate = searchParams.get('from');
    const initialEndDate = searchParams.get('to');

    // Preserve the from/to hints while switching tabs so re-selecting Export
    // still remembers the period passed in via the deep link.
    const setSection = (next: Section) => {
        const params = new URLSearchParams(searchParams);
        params.set('section', next);
        setSearchParams(params, { replace: true });
    };

    const tabs = useMemo(() => ([
        { key: 'import' as Section, label: 'Import', icon: 'Upload' },
        { key: 'export' as Section, label: 'Export', icon: 'Download' },
    ]), []);

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-3xl font-bold text-gray-darkest dark:text-gray-50">Import / Export</h2>

                <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setSection(tab.key)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                section === tab.key
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                            }`}
                        >
                            <Icon name={tab.icon} size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <Card>
                {section === 'import' ? (
                    <ImportWizard />
                ) : (
                    <ExportPanel initialStartDate={initialStartDate} initialEndDate={initialEndDate} />
                )}
            </Card>
        </div>
    );
};
