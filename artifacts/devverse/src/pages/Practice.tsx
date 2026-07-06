import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { supabase, PracticeTemplate, PracticeProject } from '../lib/supabase';
import Modal from '../components/Modal';
import {
  GraduationCap, Clock, Users, User, Code2, Palette,
  FileCode, Server, Layers, Loader, Check, Copy,
  Sparkles, ArrowRight, BookOpen, Target,
} from 'lucide-react';

interface PracticeProps {
  onOpenProject: (projectId: string) => void;
}

const categoryConfig: Record<string, { icon: typeof Code2; color: string; bg: string; label: string }> = {
  html: { icon: FileCode, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20', label: 'HTML' },
  css: { icon: Palette, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', label: 'CSS' },
  javascript: { icon: Code2, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20', label: 'JavaScript' },
  react: { icon: Layers, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-900/20', label: 'React' },
  nodejs: { icon: Server, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20', label: 'Node.js' },
  fullstack: { icon: Sparkles, color: 'text-primary-600 dark:text-primary-400', bg: 'bg-primary-50 dark:bg-primary-900/20', label: 'Full Stack' },
};

const difficultyConfig: Record<string, { color: string; label: string }> = {
  beginner: { color: 'text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-900/20', label: 'Beginner' },
  intermediate: { color: 'text-warning-600 dark:text-warning-400 bg-warning-50 dark:bg-warning-900/20', label: 'Intermediate' },
  advanced: { color: 'text-error-600 dark:text-error-400 bg-error-50 dark:bg-error-900/20', label: 'Advanced' },
};

export default function Practice({ onOpenProject }: PracticeProps) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<PracticeTemplate[]>([]);
  const [myPractice, setMyPractice] = useState<PracticeProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [startTemplate, setStartTemplate] = useState<PracticeTemplate | null>(null);

  const loadTemplates = async () => {
    const { data } = await supabase
      .from('practice_templates')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: true });
    setTemplates(data || []);
  };

  const loadMyPractice = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('practice_projects')
      .select('*, template:practice_templates(*), project:projects(*)')
      .eq('started_by', user.id)
      .order('started_at', { ascending: false });
    setMyPractice(data || []);
  };

  useEffect(() => {
    (async () => {
      await Promise.all([loadTemplates(), loadMyPractice()]);
      setLoading(false);
    })();
  }, [user]);

  const filtered = templates.filter((t) => {
    if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
    if (selectedDifficulty !== 'all' && t.difficulty !== selectedDifficulty) return false;
    return true;
  });

  const inProgress = myPractice.filter((p) => p.status === 'in_progress');

  return (
    <div className="h-full overflow-y-auto p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
              <GraduationCap size={22} className="text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Practice Projects</h1>
              <p className="text-gray-500 dark:text-gray-400">Learn by building real projects — solo or with teammates</p>
            </div>
          </div>
        </div>

        {/* In-progress practice */}
        {inProgress.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Continue Practicing</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {inProgress.map((p, i) => {
                const cat = p.template ? categoryConfig[p.template.category] : null;
                const Icon = cat?.icon || Code2;
                return (
                  <div
                    key={p.id}
                    className="card p-5 hover:shadow-md transition-all cursor-pointer group animate-slide-up"
                    style={{ animationDelay: `${i * 50}ms` }}
                    onClick={() => onOpenProject(p.project_id)}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-lg ${cat?.bg || ''} flex items-center justify-center shrink-0`}>
                        <Icon size={20} className={cat?.color || ''} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{p.template?.title || 'Practice'}</h3>
                        <p className="text-xs text-gray-400">{p.mode === 'solo' ? 'Solo practice' : 'Team practice'}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Started {new Date(p.started_at).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1 text-primary-600 dark:text-primary-400 font-medium">
                        Continue <ArrowRight size={12} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mr-1">Category:</span>
          <FilterChip label="All" active={selectedCategory === 'all'} onClick={() => setSelectedCategory('all')} />
          {Object.entries(categoryConfig).map(([key, cfg]) => (
            <FilterChip key={key} label={cfg.label} active={selectedCategory === key} onClick={() => setSelectedCategory(key)} />
          ))}
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400 ml-4 mr-1">Level:</span>
          <FilterChip label="All" active={selectedDifficulty === 'all'} onClick={() => setSelectedDifficulty('all')} />
          {Object.entries(difficultyConfig).map(([key, cfg]) => (
            <FilterChip key={key} label={cfg.label} active={selectedDifficulty === key} onClick={() => setSelectedDifficulty(key)} />
          ))}
        </div>

        {/* Template grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader size={24} className="animate-spin text-primary-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <BookOpen size={40} className="mx-auto text-gray-300 dark:text-surface-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No templates found</h3>
            <p className="text-gray-500 dark:text-gray-400">Try changing the filters above.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((template, i) => {
              const cat = categoryConfig[template.category];
              const diff = difficultyConfig[template.difficulty];
              const Icon = cat.icon;
              const alreadyStarted = myPractice.some(
                (p) => p.template_id === template.id && p.status === 'in_progress'
              );
              return (
                <div
                  key={template.id}
                  className="card p-5 hover:shadow-lg transition-all flex flex-col animate-slide-up"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-11 h-11 rounded-lg ${cat.bg} flex items-center justify-center`}>
                      <Icon size={22} className={cat.color} />
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${diff.color}`}>
                      {diff.label}
                    </span>
                  </div>

                  <h3 className="font-semibold mb-1">{template.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3 flex-1">{template.description}</p>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {template.skills.slice(0, 3).map((skill) => (
                      <span key={skill} className="text-xs px-2 py-0.5 rounded-md bg-gray-100 dark:bg-surface-100 text-gray-600 dark:text-gray-400">
                        {skill}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
                    <span className="flex items-center gap-1"><Clock size={12} /> {template.estimated_time}</span>
                    <span className="flex items-center gap-1"><Target size={12} /> {cat.label}</span>
                  </div>

                  <button
                    onClick={() => setStartTemplate(template)}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition-all ${
                      alreadyStarted
                        ? 'btn-secondary'
                        : 'btn-primary'
                    }`}
                  >
                    {alreadyStarted ? (
                      <>Restart Practice <ArrowRight size={14} /></>
                    ) : (
                      <>Start Practice <ArrowRight size={14} /></>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {startTemplate && (
        <StartPracticeModal
          template={startTemplate}
          onClose={() => setStartTemplate(null)}
          onStarted={(projectId) => { setStartTemplate(null); onOpenProject(projectId); }}
        />
      )}
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
        active
          ? 'bg-primary-600 text-white'
          : 'bg-gray-100 dark:bg-surface-100 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-surface-200'
      }`}
    >
      {label}
    </button>
  );
}

function StartPracticeModal({
  template,
  onClose,
  onStarted,
}: {
  template: PracticeTemplate;
  onClose: () => void;
  onStarted: (projectId: string) => void;
}) {
  const { user } = useAuth();
  const [mode, setMode] = useState<'solo' | 'team'>('solo');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  const cat = categoryConfig[template.category];
  const Icon = cat.icon;

  const handleStart = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Create a real project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: `Practice: ${template.title}`,
          description: template.description,
          owner_id: user.id,
        })
        .select()
        .single();

      if (projectError || !project) {
        setError(projectError?.message || 'Failed to create project');
        setLoading(false);
        return;
      }

      // 2. Copy template files into the project
      const { data: templateFiles } = await supabase
        .from('practice_template_files')
        .select('*')
        .eq('template_id', template.id)
        .order('sort_order', { ascending: true });

      if (templateFiles && templateFiles.length > 0) {
        const fileInserts = templateFiles.map((tf) => ({
          project_id: project.id,
          name: tf.name,
          path: tf.path,
          type: 'file' as const,
          language: tf.language,
          content: tf.content,
          created_by: user.id,
        }));
        await supabase.from('files').insert(fileInserts);
      }

      // 3. Create a practice_projects record
      const { error: practiceError } = await supabase
        .from('practice_projects')
        .insert({
          template_id: template.id,
          project_id: project.id,
          started_by: user.id,
          mode,
          status: 'in_progress',
        });

      if (practiceError) {
        setError(practiceError.message);
        setLoading(false);
        return;
      }

      // 4. If solo mode, open the project immediately
      if (mode === 'solo') {
        setLoading(false);
        onStarted(project.id);
      } else {
        // Team mode — show the invite code so they can share it
        setCreatedProjectId(project.id);
        setInviteCode(project.invite_code);
        setLoading(false);
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // After team creation, show invite code screen
  if (createdProjectId && inviteCode) {
    return (
      <Modal open onClose={onClose} title="Practice Project Created!" size="md">
        <div className="space-y-5">
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-success-50 dark:bg-success-900/20 flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="text-success-500" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Your practice project is ready!</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Share this invite code with 1-2 teammates so they can join and help you build.
            </p>
          </div>

          <div className="card p-4">
            <label className="block text-xs font-medium text-gray-500 mb-2">Invite code</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-lg font-mono px-3 py-2 bg-gray-100 dark:bg-surface-100 rounded-lg text-center tracking-wider">
                {inviteCode.toUpperCase()}
              </code>
              <button onClick={copyCode} className="btn-secondary p-2.5">
                {copied ? <Check size={16} className="text-success-500" /> : <Copy size={16} />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Your teammates: sign up, go to Projects, click "Join", and enter this code.
            </p>
          </div>

          <div className="card p-4 bg-primary-50 dark:bg-primary-900/10 border-primary-200 dark:border-primary-800">
            <div className="flex items-start gap-2">
              <BookOpen size={16} className="text-primary-600 dark:text-primary-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium mb-1">Instructions for this practice:</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-line">{template.instructions}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button onClick={onClose} className="btn-secondary">Stay here</button>
            <button onClick={() => onStarted(createdProjectId)} className="btn-primary">
              Open Project <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} title="Start Practice" size="md">
      <div className="space-y-5">
        {/* Template info */}
        <div className="card p-4">
          <div className="flex items-start gap-3 mb-3">
            <div className={`w-10 h-10 rounded-lg ${cat.bg} flex items-center justify-center shrink-0`}>
              <Icon size={20} className={cat.color} />
            </div>
            <div>
              <h3 className="font-semibold">{template.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{template.description}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {template.skills.map((skill) => (
              <span key={skill} className="text-xs px-2 py-0.5 rounded-md bg-gray-100 dark:bg-surface-100 text-gray-600 dark:text-gray-400">
                {skill}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1"><Clock size={12} /> {template.estimated_time}</span>
          </div>
        </div>

        {/* Mode selection */}
        <div>
          <label className="block text-sm font-medium mb-2">How do you want to practice?</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setMode('solo')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                mode === 'solo'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-surface-300 hover:border-gray-300'
              }`}
            >
              <User size={20} className={`mb-2 ${mode === 'solo' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}`} />
              <p className="font-semibold text-sm">Solo</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Work alone at your own pace</p>
            </button>
            <button
              onClick={() => setMode('team')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                mode === 'team'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-surface-300 hover:border-gray-300'
              }`}
            >
              <Users size={20} className={`mb-2 ${mode === 'team' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}`} />
              <p className="font-semibold text-sm">With Teammates</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Invite 1-2 people to help</p>
            </button>
          </div>
        </div>

        {/* Instructions preview */}
        <div className="card p-4 bg-gray-50 dark:bg-surface-100">
          <div className="flex items-start gap-2">
            <BookOpen size={16} className="text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium mb-1">What you will build:</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-line">{template.instructions}</p>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-error-600 dark:text-error-400">{error}</p>}

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleStart} disabled={loading} className="btn-primary">
            {loading ? <Loader size={16} className="animate-spin" /> : <GraduationCap size={16} />}
            {mode === 'solo' ? 'Start Solo Practice' : 'Start Team Practice'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
