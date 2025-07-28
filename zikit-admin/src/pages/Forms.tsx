import React, { useEffect, useState } from 'react';
import { Form } from '../models/Form';
import { getAllForms, addForm, updateForm, deleteForm } from '../services/formService';
import { Soldier } from '../models/Soldier';
import { getAllSoldiers } from '../services/soldierService';

function formatDate(val: any) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (val.seconds) {
    const date = new Date(val.seconds * 1000);
    return date.toLocaleDateString('he-IL');
  }
  return val.toString();
}

const emptyForm: Omit<Form, 'id'> = {
  soldierId: '',
  fileUrl: '',
  uploadedAt: '',
  fileType: '',
  description: '',
};

const Forms: React.FC = () => {
  const [forms, setForms] = useState<Form[]>([]);
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Omit<Form, 'id'>>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const refresh = () => {
    setLoading(true);
    Promise.all([getAllForms(), getAllSoldiers()])
      .then(([formsData, soldiersData]) => {
        setForms(formsData);
        setSoldiers(soldiersData);
      })
      .catch(() => {
        setForms([]);
        setSoldiers([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
  }, []);

  // דמו אם אין נתונים
  const demo: Form[] = [
    {
      id: '1',
      soldierId: '1',
      fileUrl: 'https://example.com/file.pdf',
      uploadedAt: '2024-07-23',
      fileType: 'pdf',
      description: 'טופס ראיון אישי',
    },
  ];
  const demoSoldiers: Soldier[] = [
    { id: '1', name: 'יוסי כהן', personalNumber: '1234567', team: 'צוות א', role: 'לוחם', profile: '97', qualifications: ['ירי', 'קשר'], licenses: ['B'], certifications: ['הסמכת חובש'] },
  ];

  const data = forms.length > 0 ? forms : demo;
  const soldiersData = soldiers.length > 0 ? soldiers : demoSoldiers;

  const getSoldierName = (id: string) => {
    const s = soldiersData.find(s => s.id === id);
    return s ? s.name : id;
  };

  const handleOpenForm = (form?: Form) => {
    if (form) {
      const { id, ...rest } = form;
      setFormData(rest);
      setEditId(id);
    } else {
      setFormData(emptyForm);
      setEditId(null);
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setFormData(emptyForm);
    setEditId(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      await updateForm(editId, formData);
    } else {
      await addForm(formData);
    }
    handleCloseForm();
    refresh();
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteForm(deleteId);
      setDeleteId(null);
      refresh();
    }
  };

  return (
    <div style={{ direction: 'rtl', padding: 24 }}>
      <h2>רשימת טפסים</h2>
      <button onClick={() => handleOpenForm()} style={{ marginBottom: 16 }}>הוסף טופס</button>
      {loading ? (
        <div>טוען...</div>
      ) : (
        <table border={1} cellPadding={8} style={{ width: '100%', background: '#fff' }}>
          <thead>
            <tr>
              <th>מזהה</th>
              <th>חייל</th>
              <th>קובץ</th>
              <th>תאריך העלאה</th>
              <th>סוג קובץ</th>
              <th>תיאור</th>
              <th>עריכה</th>
              <th>מחיקה</th>
            </tr>
          </thead>
          <tbody>
            {data.map((f) => (
              <tr key={f.id}>
                <td>{f.id}</td>
                <td>{getSoldierName(f.soldierId)}</td>
                <td><a href={f.fileUrl} target="_blank" rel="noopener noreferrer">הצג קובץ</a></td>
                <td>{formatDate(f.uploadedAt)}</td>
                <td>{f.fileType}</td>
                <td>{f.description}</td>
                <td><button onClick={() => handleOpenForm(f)}>ערוך</button></td>
                <td><button onClick={() => setDeleteId(f.id)}>מחק</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {showForm && (
        <div style={{ background: '#fff', border: '1px solid #ccc', padding: 24, marginTop: 24 }}>
          <h3>{editId ? 'עריכת טופס' : 'הוספת טופס'}</h3>
          <form onSubmit={handleSubmit}>
            <div>
              <label>חייל: <input name="soldierId" value={formData.soldierId} onChange={handleChange} required /></label>
            </div>
            <div>
              <label>קובץ (URL): <input name="fileUrl" value={formData.fileUrl} onChange={handleChange} required /></label>
            </div>
            <div>
              <label>תאריך העלאה: <input name="uploadedAt" value={formData.uploadedAt} onChange={handleChange} required /></label>
            </div>
            <div>
              <label>סוג קובץ: <input name="fileType" value={formData.fileType} onChange={handleChange} /></label>
            </div>
            <div>
              <label>תיאור: <textarea name="description" value={formData.description} onChange={handleChange} /></label>
            </div>
            <button type="submit">{editId ? 'שמור' : 'הוסף'}</button>
            <button type="button" onClick={handleCloseForm} style={{ marginRight: 8 }}>ביטול</button>
          </form>
        </div>
      )}
      {deleteId && (
        <div style={{ background: '#fff', border: '1px solid #f00', padding: 16, marginTop: 24 }}>
          <p>האם אתה בטוח שברצונך למחוק טופס זה?</p>
          <button onClick={handleDelete} style={{ color: 'red' }}>מחק</button>
          <button onClick={() => setDeleteId(null)} style={{ marginRight: 8 }}>ביטול</button>
        </div>
      )}
    </div>
  );
};

export default Forms; 