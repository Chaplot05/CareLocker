'use client';

import React, { useState } from 'react';
import Papa from 'papaparse';
import { Modal } from '@/components/common/Modal';
import { Upload, FileText, CheckCircle2, AlertCircle, Download, Loader2 } from 'lucide-react';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CsvImportModal({ isOpen, onClose, onSuccess }: CsvImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<{
    insertedCount: number;
    errorsCount: number;
    errors?: any[];
  } | null>(null);

  const sampleCsvContent = `patient_code,name,phone,email,date_of_birth
PAT-2026-101,Amit Verma,+91 98111 22334,amit.verma@example.com,1985-06-15
PAT-2026-102,Deepa Nair,+91 98450 99881,deepa.nair@example.com,1992-12-04
PAT-2026-103,Rohan Chawla,+91 97170 33445,rohan.chawla@example.com,1979-03-21`;

  const downloadSampleCsv = () => {
    const blob = new Blob([sampleCsvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'carelocker_patients_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setImportSummary(null);
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please upload a valid .csv file.');
      return;
    }

    setFile(selectedFile);

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError(`CSV parsing error: ${results.errors[0].message}`);
        } else {
          setPreviewRows(results.data);
        }
      },
    });
  };

  const handleImport = async () => {
    if (!previewRows.length) return;
    setIsImporting(true);
    setError(null);

    try {
      const res = await fetch('/api/patients/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: previewRows }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to import CSV records');
      }

      setImportSummary({
        insertedCount: data.insertedCount,
        errorsCount: data.errorsCount,
        errors: data.errors,
      });

      if (data.insertedCount > 0) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during import.');
    } finally {
      setIsImporting(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreviewRows([]);
    setError(null);
    setImportSummary(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={reset}
      title="Bulk Import Patients via CSV"
      description="Upload a CSV file to create multiple patient records simultaneously."
      maxWidth="4xl"
    >
      <div className="space-y-5">
        {/* Template download & instructions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl bg-lavender-50/70 p-4 border border-lavender-200">
          <div className="text-xs text-lavender-900">
            <span className="font-semibold block mb-0.5">CSV Format Requirements:</span>
            <span>Columns must include: <code className="font-mono font-semibold">patient_code</code>, <code className="font-mono font-semibold">name</code>, <code className="font-mono font-semibold">phone</code>, <code className="font-mono font-semibold">email</code>, <code className="font-mono font-semibold">date_of_birth</code>.</span>
          </div>
          <button
            onClick={downloadSampleCsv}
            type="button"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-lavender-300 bg-white px-3 py-1.5 text-xs font-semibold text-lavender-800 hover:bg-lavender-100 transition-colors shadow-xs"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download Sample CSV</span>
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-peach-200 bg-peach-50 p-3.5 text-sm text-peach-800">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-peach-600" />
            <span>{error}</span>
          </div>
        )}

        {importSummary && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Import Completed: {importSummary.insertedCount} patients registered successfully!</span>
            </div>
            {importSummary.errorsCount > 0 && (
              <div className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                <span className="font-semibold">{importSummary.errorsCount} rows skipped due to duplicate code or invalid data:</span>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  {importSummary.errors?.slice(0, 5).map((e, idx) => (
                    <li key={idx}>Row {e.row}: {e.error}</li>
                  ))}
                  {(importSummary.errors?.length || 0) > 5 && (
                    <li>...and {importSummary.errors!.length - 5} more issues.</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Upload Dropzone */}
        {!file ? (
          <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center hover:border-lavender-500 hover:bg-lavender-50/20 cursor-pointer transition-all">
            <div className="rounded-xl bg-lavender-100 p-3 text-lavender-700 mb-3">
              <Upload className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-slate-800">Choose a CSV file or drag and drop</p>
            <p className="text-xs text-slate-400 mt-1">UTF-8 encoded .csv files up to 5MB</p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2.5">
                <FileText className="h-5 w-5 text-lavender-600" />
                <div>
                  <p className="text-xs font-semibold text-slate-800">{file.name}</p>
                  <p className="text-[11px] text-slate-400">
                    {previewRows.length} records parsed from CSV
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setPreviewRows([]);
                }}
                className="text-xs font-semibold text-peach-600 hover:text-peach-700"
              >
                Change File
              </button>
            </div>

            {/* Preview table */}
            <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-100 font-semibold text-slate-600 sticky top-0">
                  <tr>
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Phone</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">DOB</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {previewRows.slice(0, 10).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-3 py-1.5 font-mono text-slate-800 font-medium">
                        {row.patient_code || row.PatientCode || row['Patient ID'] || '—'}
                      </td>
                      <td className="px-3 py-1.5 text-slate-700">{row.name || row.Name || '—'}</td>
                      <td className="px-3 py-1.5 text-slate-600">{row.phone || row.Phone || '—'}</td>
                      <td className="px-3 py-1.5 text-slate-600">{row.email || row.Email || '—'}</td>
                      <td className="px-3 py-1.5 text-slate-500">{row.date_of_birth || row.DOB || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewRows.length > 10 && (
                <div className="bg-slate-50 px-3 py-1.5 text-center text-[11px] text-slate-500 border-t border-slate-200">
                  Showing first 10 rows of {previewRows.length} total rows
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
          <button
            type="button"
            disabled={!previewRows.length || isImporting}
            onClick={handleImport}
            className="inline-flex items-center gap-2 rounded-xl bg-peach-500 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-peach-600 disabled:opacity-50 transition-all"
          >
            {isImporting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Importing records...</span>
              </>
            ) : (
              <span>Confirm & Import ({previewRows.length})</span>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

