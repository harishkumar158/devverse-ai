import { useEffect, useState, useRef } from 'react';
import { FileNode } from '../lib/supabase';
import { Monitor, Tablet, Smartphone } from 'lucide-react';

interface PreviewProps {
  files: FileNode[];
}

type Device = 'desktop' | 'tablet' | 'mobile';

const deviceWidths: Record<Device, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
};

export default function Preview({ files }: PreviewProps) {
  const [device, setDevice] = useState<Device>('desktop');
  const [srcDoc, setSrcDoc] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const htmlFile = files.find((f) => f.language === 'html');
    const cssFiles = files.filter((f) => f.language === 'css');
    const jsFiles = files.filter((f) => f.language === 'javascript');

    if (!htmlFile) {
      setSrcDoc('<!DOCTYPE html><html><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;color:#999;background:#1a1d27;"><p>No HTML file found. Create an index.html to see a preview.</p></body></html>');
      return;
    }

    let html = htmlFile.content;

    // Inline CSS
    const css = cssFiles.map((f) => f.content).join('\n');
    // Inline JS
    const js = jsFiles.map((f) => f.content).join('\n');

    // Replace <link> tags for local css with inline style
    html = html.replace(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi, '');
    // Replace <script src="..."> for local files
    html = html.replace(/<script[^>]*src=["'][^"']*["'][^>]*><\/script>/gi, '');

    // Inject styles and scripts before </head> and </body>
    if (css) {
      html = html.replace('</head>', `<style>${css}</style></head>`);
    }
    if (js) {
      html = html.replace('</body>', `<script>${js}<\/script></body>`);
    }

    setSrcDoc(html);
  }, [files]);

  return (
    <div className="h-full flex flex-col bg-surface-50 dark:bg-surface">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-surface-300 bg-white dark:bg-surface-50">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Live Preview</span>
        <div className="flex gap-0.5 bg-gray-100 dark:bg-surface-100 rounded-lg p-0.5">
          {([
            { id: 'desktop' as Device, icon: Monitor },
            { id: 'tablet' as Device, icon: Tablet },
            { id: 'mobile' as Device, icon: Smartphone },
          ]).map((d) => (
            <button
              key={d.id}
              onClick={() => setDevice(d.id)}
              className={`p-1.5 rounded-md transition-colors ${device === d.id ? 'bg-white dark:bg-surface-200 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
            >
              <d.icon size={16} />
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-gray-100 dark:bg-surface p-4 flex justify-center">
        <iframe
          ref={iframeRef}
          srcDoc={srcDoc}
          title="preview"
          className="bg-white rounded-lg shadow-lg border-0 transition-all duration-300"
          style={{ width: deviceWidths[device], maxWidth: '100%', height: '100%' }}
          sandbox="allow-scripts allow-modals"
        />
      </div>
    </div>
  );
}
