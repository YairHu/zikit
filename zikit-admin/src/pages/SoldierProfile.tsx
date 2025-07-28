import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSoldierById } from '../services/soldierService';
import { Soldier } from '../models/Soldier';

const SoldierProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [soldier, setSoldier] = useState<Soldier | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      getSoldierById(id)
        .then(setSoldier)
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) return <div>טוען...</div>;
  if (!soldier) return <div>לא נמצא חייל</div>;

  return (
    <div style={{ direction: 'rtl', padding: 32, maxWidth: 600, margin: '0 auto', background: '#fff', borderRadius: 8 }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>חזור</button>
      <h2>פרופיל חייל: {soldier.name}</h2>
      <div><b>מס' אישי:</b> {soldier.personalNumber}</div>
      <div><b>צוות:</b> {soldier.team}</div>
      <div><b>תפקיד:</b> {soldier.role}</div>
      <div><b>פרופיל:</b> {soldier.profile}</div>
      <div><b>כשירויות:</b> {soldier.qualifications?.join(', ')}</div>
      <div><b>רישיונות:</b> {soldier.licenses?.join(', ')}</div>
      <div><b>הסמכות:</b> {soldier.certifications?.join(', ')}</div>
      {soldier.family && <div><b>משפחה:</b> {soldier.family}</div>}
      {soldier.militaryBackground && <div><b>רקע צבאי:</b> {soldier.militaryBackground}</div>}
      {soldier.notes && <div><b>הערות:</b> {soldier.notes}</div>}
      {soldier.medicalProfile && <div><b>פרופיל רפואי:</b> {soldier.medicalProfile}</div>}
      {soldier.documents && (
        <div><b>מסמכים:</b> {soldier.documents.map((url, i) => <div key={i}><a href={url} target="_blank" rel="noopener noreferrer">קובץ {i+1}</a></div>)}</div>
      )}
    </div>
  );
};

export default SoldierProfile; 