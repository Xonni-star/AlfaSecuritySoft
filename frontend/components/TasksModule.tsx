import React, { useEffect, useRef, useState } from 'react';
import { CheckSquare, Plus, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useSecurityStore } from '../store';

export const TasksModule: React.FC = () => {
  const { tasks, toggleTaskStatus, addTask, currentTenantId, currentUserId, authUser } = useSecurityStore();
  const [title, setTitle] = useState('');
  const [assignedToName, setAssignedToName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const identity = `${currentTenantId}:${authUser?.id || currentUserId}`;
  const identityRef = useRef(identity);
  identityRef.current = identity;

  useEffect(() => {
    setTitle('');
    setAssignedToName('');
    setIsSaving(false);
    setPendingTaskId(null);
    setError('');
  }, [identity]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (title.trim().length < 2 || assignedToName.trim().length < 2) {
      setError('Bitte einen Aufgabentitel und eine verantwortliche Person mit mindestens zwei Zeichen angeben.');
      return;
    }

    setError('');
    setIsSaving(true);
    try {
      const saved = await addTask({
        title: title.trim(),
        assignedToName: assignedToName.trim(),
        dueDate: new Date(Date.now() + 1000 * 3600 * 24 * 7).toISOString().split('T')[0],
        priority: 'Mittel',
        status: 'Offen',
        category: 'Audit'
      });
      if (identityRef.current !== identity) return;
      if (!saved) setError('Die Aufgabe wurde nicht bestätigt. Die Eingaben bleiben erhalten.');
      else setTitle('');
    } catch (failure) {
      if (identityRef.current === identity) setError(failure instanceof Error ? failure.message : 'Aufgabe konnte nicht gespeichert werden.');
    } finally {
      if (identityRef.current === identity) setIsSaving(false);
    }
  };

  const handleToggle = async (taskId: string) => {
    if (pendingTaskId) return;
    setError('');
    setPendingTaskId(taskId);
    try {
      const saved = await toggleTaskStatus(taskId);
      if (identityRef.current === identity && !saved) setError('Der Aufgabenstatus wurde nicht bestätigt.');
    } catch (failure) {
      if (identityRef.current === identity) setError(failure instanceof Error ? failure.message : 'Aufgabenstatus konnte nicht gespeichert werden.');
    } finally {
      if (identityRef.current === identity) setPendingTaskId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-blue-400" />
            <h1 className="text-xl font-bold text-white">Aufgaben- & Maßnahmenmanagement</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Wartungen, Nachschulungen, Kundenanforderungen und Audit-Fristen.
          </p>
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      {/* Add Task Box */}
      <form onSubmit={event => void handleAdd(event)} className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          aria-label="Aufgabentitel"
          required
          minLength={2}
          maxLength={255}
          disabled={isSaving}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Neue Aufgabe / Korrekturmaßnahme eingeben..."
          className="flex-1 bg-slate-800 text-xs text-slate-200 px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-blue-500"
        />
        <input
          type="text"
          aria-label="Verantwortlich"
          required
          minLength={2}
          maxLength={100}
          disabled={isSaving}
          value={assignedToName}
          onChange={(e) => setAssignedToName(e.target.value)}
          placeholder="Verantwortlich"
          className="sm:w-48 bg-slate-800 text-xs text-slate-200 px-3 py-2 rounded-lg border border-slate-700"
        />
        <button
          type="submit"
          disabled={isSaving}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow"
        >
          Aufgabe erstellen
        </button>
      </form>

      {/* Task List */}
      <div className="space-y-2">
        {tasks.map((task) => (
          <label
            key={task.id}
            className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer flex items-center justify-between transition"
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                aria-label={`Status von ${task.title} ändern`}
                disabled={pendingTaskId !== null}
                checked={task.status === 'Erledigt'}
                onChange={() => void handleToggle(task.id)}
                className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
              />
              <div>
                <span className={`text-xs font-semibold ${task.status === 'Erledigt' ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                  {task.title}
                </span>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Verantwortlich: {task.assignedToName} • Frist: {task.dueDate} • Kategorie: {task.category}
                </div>
              </div>
            </div>

            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              task.status === 'Erledigt' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
            }`}>
              {task.status}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
};
