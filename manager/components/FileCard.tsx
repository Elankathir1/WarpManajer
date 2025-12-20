
import React from 'react';
import { FileText, X, CheckCircle2 } from 'lucide-react';
import { CodeFile } from '../types';

interface FileCardProps {
  file: CodeFile;
  onRemove?: () => void;
  isUpdated?: boolean;
}

const FileCard: React.FC<FileCardProps> = ({ file, onRemove, isUpdated }) => {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-800/50 border border-slate-700 rounded-lg group hover:border-indigo-500 transition-colors">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-500/10 rounded">
          <FileText className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-200 truncate max-w-[150px] md:max-w-[200px]">
            {file.name}
          </p>
          <p className="text-xs text-slate-400">
            {(file.content.length / 1024).toFixed(1)} KB
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isUpdated && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
        {onRemove && (
          <button
            onClick={onRemove}
            className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default FileCard;
