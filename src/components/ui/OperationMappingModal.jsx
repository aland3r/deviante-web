import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * OperationMappingModal — UC6: Map a raw operation label to an activity
 * from the shared catalog (UC3).
 *
 * Props:
 * - operation: OperationRecord (id, rawLabel, etc)
 * - activities: ActivityRecord[] (catalog to choose from)
 * - onSuccess: callback when mapping succeeds (receives updated OperationRecord)
 * - onClose: callback to close modal
 */
export default function OperationMappingModal({
  operation,
  activities,
  onSuccess,
  onClose,
}) {
  const [selectedActivityId, setSelectedActivityId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleMap = async () => {
    if (!selectedActivityId) {
      setError('Selecione uma atividade');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/operations/${operation.id}/map`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await getAuthToken()}`,
        },
        body: JSON.stringify({
          activityId: selectedActivityId,
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao mapear operação');
      }

      const updatedOperation = await response.json();
      onSuccess(updatedOperation);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mapear Operação</DialogTitle>
          <DialogDescription>
            Vincule a operação "{operation.rawLabel}" ({operation.occurrenceCount} ocorrências) a uma atividade do catálogo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium">Atividade</label>
            <Select value={selectedActivityId} onValueChange={setSelectedActivityId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma atividade..." />
              </SelectTrigger>
              <SelectContent>
                {activities.length === 0 ? (
                  <div className="p-2 text-center text-sm text-gray-500">
                    Nenhuma atividade disponível
                  </div>
                ) : (
                  activities.map((activity) => (
                    <SelectItem key={activity.id} value={activity.id}>
                      {activity.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleMap} disabled={loading || !selectedActivityId}>
            {loading ? 'Mapeando...' : 'Mapear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

async function getAuthToken() {
  const authContext = window.__deviante_auth;
  return authContext?.token || '';
}
