import { useEffect } from 'react';
import { socket } from '@/lib/socket';
import { useStore } from '@/store/useStore';
import { toast } from 'sonner';

export const useSocketEvents = () => {
  const { currentUser, fetchEmergencies, fetchDashboardStats } = useStore();

  useEffect(() => {
    if (!currentUser) return;

    const role = currentUser.role;
    const entityId = currentUser.entity_id;
    let roomName = '';

    // ── Helper: join the correct room ─────────────────────────────────────────
    const joinRoom = () => {
      if (role === 'admin') {
        roomName = 'admin';
        socket.emit('join_admin');
      } else if (role === 'hospital' && entityId) {
        roomName = `hospital_${entityId}`;
        socket.emit('join_hospital', { hospital_id: entityId });
      } else if (role === 'ambulance' && entityId) {
        roomName = `ambulance_${entityId}`;
        socket.emit('join_ambulance', { ambulance_id: entityId });
      }
    };

    // Join immediately on mount (or if already connected)
    joinRoom();

    // ── GAP 1: Connection lifecycle ───────────────────────────────────────────
    const handleConnect = () => {
      useStore.getState().setSocketConnected(true);
      // Auto-rejoin the correct room after a reconnect
      joinRoom();
    };

    const handleDisconnect = () => {
      useStore.getState().setSocketConnected(false);
    };

    // ── 1. SLA Breach (Admin Only) ────────────────────────────────────────────
    const handleSlaBreach = (data: any) => {
      toast.error(`SLA Breached: ${data.type.toUpperCase()} - ASG-${String(data.emergency_id).padStart(3, '0')}`, {
        description: `${data.message} (${data.minutes_elapsed}m / ${data.target_minutes}m)`,
        duration: 0,
      });
      
      useStore.getState().addSlaBreach({
        emergency_id: data.emergency_id,
        severity: data.severity,
        patient_name: data.patient_name,
        type: data.type,
        current_status: data.current_status,
        minutes_elapsed: data.minutes_elapsed,
        target_minutes: data.target_minutes,
        message: data.message,
        received_at: new Date().toISOString(),
      });
      fetchDashboardStats();
    };

    // ── 2. Availability Updated ───────────────────────────────────────────────
    const handleAvailabilityUpdated = (data: any) => {
      if (role === 'admin') {
        toast.info(`Hospital availability updated`, {
          description: `Beds: ${data.available_beds}`,
        });
      }
      useStore.setState(s => ({
        hospitals: s.hospitals.map(h =>
          h.hospital_id === data.hospital_id
            ? { ...h, available_beds: data.available_beds, status: data.status }
            : h
        ),
      }));
    };

    // ── 3. Emergency Allocated (Hospital) ─────────────────────────────────────
    const handleEmergencyAllocated = (data: any) => {
      toast.warning('New Emergency Allocated!', {
        description: `Emergency #${data.emergency_id} allocated to your hospital.`,
      });
      fetchEmergencies();
    };

    // ── 4. Emergency Acknowledged (Ambulance) ─────────────────────────────────
    const handleEmergencyAcknowledged = (data: any) => {
      toast.success('Emergency Acknowledged', {
        description: `Assigned Hospital: ${data.hospital_name}`,
      });
      fetchEmergencies();
    };

    // ── 5. Emergency Status Updated ───────────────────────────────────────────
    const handleEmergencyStatusUpdated = (data: any) => {
      useStore.setState(s => ({
        emergencies: s.emergencies.map(e =>
          e.emergency_id === data.emergency_id ? { ...e, status: data.new_status } : e
        ),
      }));
    };

    // ── 6. Ambulance Location Update ─────────────────────────────────────────
    const handleAmbulanceLocationUpdate = (data: any) => {
      const { ambulance_id, latitude, longitude, timestamp } = data;

      // A: Update ambulances[] store — keeps Admin map live
      useStore.setState(s => ({
        ambulances: s.ambulances.map(a =>
          a.ambulance_id === ambulance_id
            ? { ...a, latitude, longitude, last_updated: timestamp }
            : a
        ),

        // B: Also update ambulance coords INSIDE emergencies[]
        // This keeps Hospital map live without re-fetching from API
        emergencies: s.emergencies.map(e =>
          e.ambulance_id === ambulance_id && e.ambulance
            ? {
              ...e,
              ambulance: {
                ...e.ambulance,
                latitude,
                longitude,
              },
            }
            : e
        ),
      }));
    };

    // ── Register listeners ────────────────────────────────────────────────────
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('sla_breach', handleSlaBreach);
    socket.on('availability_updated', handleAvailabilityUpdated);
    socket.on('emergency_allocated', handleEmergencyAllocated);
    socket.on('emergency_acknowledged', handleEmergencyAcknowledged);
    socket.on('emergency_status_updated', handleEmergencyStatusUpdated);
    socket.on('ambulance_location_update', handleAmbulanceLocationUpdate);

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('sla_breach', handleSlaBreach);
      socket.off('availability_updated', handleAvailabilityUpdated);
      socket.off('emergency_allocated', handleEmergencyAllocated);
      socket.off('emergency_acknowledged', handleEmergencyAcknowledged);
      socket.off('emergency_status_updated', handleEmergencyStatusUpdated);
      socket.off('ambulance_location_update', handleAmbulanceLocationUpdate);

      if (roomName) socket.emit('leave', { room: roomName });
    };
  }, [currentUser, fetchEmergencies, fetchDashboardStats]);
};