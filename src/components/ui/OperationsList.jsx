import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import OperationMappingModal from './OperationMappingModal';

/**
 * OperationsList — UC5/UC6: Display operations extracted from an event log,
 * allow mapping to activities catalog (UC3).
 *
 * Props:
 * - eventLogId: UUID of the event log
 * - processId: UUID of the process (for activity context)
 */
export default function OperationsList({ eventLogId, processId }) {
  const [operations, setOperations] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedOperation, setSelectedOperation] = useState(null);
  const [showMappingModal, setShowMappingModal] = useState(false);

  useEffect(() => {
    fetchOperations();
    fetchActivities();
  }, [eventLogId]);

  const fetchOperations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/event-logs/${eventLogId}/operations`, {
        headers: { Authorization: `Bearer ${await getAuthToken()}` },
      });
      if (!response.ok) throw new Error('Failed to fetch operations');
      const data = await response.json();
      setOperations(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      const response = await fetch('/api/activities');
      if (!response.ok) throw new Error('Failed to fetch activities');
      const data = await response.json();
      setActivities(data);
    } catch (err) {
      console.error('Failed to fetch activities:', err);
    }
  };

  const handleMapClick = (operation) => {
    setSelectedOperation(operation);
    setShowMappingModal(true);
  };

  const handleMapSuccess = (updatedOperation) => {
    setOperations(
      operations.map((op) =>
        op.id === updatedOperation.id ? updatedOperation : op
      )
    );
    setShowMappingModal(false);
    setSelectedOperation(null);
  };

  const handleUnmapClick = async (operationId) => {
    try {
      const response = await fetch(`/api/operations/${operationId}/unmap`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${await getAuthToken()}` },
      });
      if (!response.ok) throw new Error('Failed to unmap operation');
      const updatedOperation = await response.json();
      handleMapSuccess(updatedOperation);
    } catch (err) {
      setError(err.message);
    }
  };

  const getMappingStatusBadge = (status) => {
    const variants = {
      unmapped: 'destructive',
      auto_mapped: 'warning',
      mapped: 'success',
    };
    return variants[status] || 'default';
  };

  if (loading) return <div className="text-center py-4">Carregando operações...</div>;
  if (error) return <div className="text-red-600 py-4">Erro: {error}</div>;

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Operação (Label)</TableHead>
              <TableHead>Ocorrências</TableHead>
              <TableHead>Atividade Mapeada</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {operations.length === 0 ? (
              <TableRow>
                <TableCell colSpan="5" className="text-center text-gray-500">
                  Nenhuma operação encontrada
                </TableCell>
              </TableRow>
            ) : (
              operations.map((operation) => (
                <TableRow key={operation.id}>
                  <TableCell className="font-mono">{operation.rawLabel}</TableCell>
                  <TableCell>{operation.occurrenceCount}</TableCell>
                  <TableCell>
                    {operation.activityId
                      ? activities.find((a) => a.id === operation.activityId)?.name ||
                        'Atividade não encontrada'
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getMappingStatusBadge(operation.mappingStatus)}>
                      {operation.mappingStatus === 'unmapped' && 'Não Mapeado'}
                      {operation.mappingStatus === 'auto_mapped' && 'Auto Mapeado'}
                      {operation.mappingStatus === 'mapped' && 'Mapeado'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {operation.mappingStatus === 'unmapped' ? (
                      <Button
                        size="sm"
                        onClick={() => handleMapClick(operation)}
                      >
                        Mapear
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUnmapClick(operation.id)}
                      >
                        Desmapar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {showMappingModal && selectedOperation && (
        <OperationMappingModal
          operation={selectedOperation}
          activities={activities}
          onSuccess={handleMapSuccess}
          onClose={() => setShowMappingModal(false)}
        />
      )}
    </>
  );
}

async function getAuthToken() {
  // Assuming auth is managed globally; adjust to your auth context
  const authContext = window.__deviante_auth;
  return authContext?.token || '';
}
