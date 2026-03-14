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

    // Join room
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

    // 1. SLA Breach (Admin Only)
    const handleSlaBreach = (data: any) => {
      toast.error(`SLA Breached: Emergency #${data.emergency_id} (${data.severity}) has exceeded its deadline.`, {
        description: `Patient: ${data.patient_name || 'Unknown'}`,
        duration: 0, // Persistent
      });
      fetchDashboardStats(); // Refresh breach counts
    };

    // 2. Availability Updated (Admin visibility, Store update)
    const handleAvailabilityUpdated = (data: any) => {
      if (role === 'admin') {
        toast.info(`Hospital availability updated: ${data.hospital_name || data.hospital_id}`, {
          description: `Beds: ${data.available_beds}`,
        });
      }
      
      // Update store
      useStore.setState((s) => ({
        hospitals: s.hospitals.map((h) =>
          h.hospital_id === data.hospital_id
            ? { ...h, available_beds: data.available_beds, status: data.status as any }
            : h
        ),
      }));
    };

    // 3. Emergency Allocated (Hospital Only)
    const handleEmergencyAllocated = (data: any) => {
      toast.warning('New Emergency Allocated!', {
        description: `Emergency #${data.emergency_id} allocated to your hospital.`,
      });
      fetchEmergencies(); // Refresh active list
    };

    // 4. Emergency Acknowledged (Ambulance Only)
    const handleEmergencyAcknowledged = (data: any) => {
      toast.success('Emergency Acknowledged', {
        description: `Assigned Hospital: ${data.hospital_name}`,
      });
      fetchEmergencies(); // Refresh status
    };

    // 5. Emergency Status Updated (Admin visibility, Store update)
    const handleEmergencyStatusUpdated = (data: any) => {
      // Update store
      useStore.setState((s) => ({
        emergencies: s.emergencies.map((e) =>
          e.emergency_id === data.emergency_id ? { ...e, status: data.new_status } : e
        ),
      }));
    };

    // 6. Ambulance Location Update (Admin, Hospital, Ambulance)
    const handleAmbulanceLocationUpdate = (data: any) => {
      // Update store
      useStore.setState((s) => ({
        ambulances: s.ambulances.map((a) =>
          a.ambulance_id === data.ambulance_id
            ? { 
                ...a, 
                latitude: data.latitude, 
                longitude: data.longitude,
                last_updated: data.timestamp 
              }
            : a
        ),
      }));
    };

    // Register listeners
    socket.on('sla_breach', handleSlaBreach);
    socket.on('availability_updated', handleAvailabilityUpdated);
    socket.on('emergency_allocated', handleEmergencyAllocated);
    socket.on('emergency_acknowledged', handleEmergencyAcknowledged);
    socket.on('emergency_status_updated', handleEmergencyStatusUpdated);
    socket.on('ambulance_location_update', handleAmbulanceLocationUpdate);

    // Cleanup
    return () => {
      socket.off('sla_breach', handleSlaBreach);
      socket.off('availability_updated', handleAvailabilityUpdated);
      socket.off('emergency_allocated', handleEmergencyAllocated);
      socket.off('emergency_acknowledged', handleEmergencyAcknowledged);
      socket.off('emergency_status_updated', handleEmergencyStatusUpdated);
      socket.off('ambulance_location_update', handleAmbulanceLocationUpdate);
      
      if (roomName) {
        socket.emit('leave', { room: roomName });
      }
    };
  }, [currentUser, fetchEmergencies, fetchDashboardStats]);
};
