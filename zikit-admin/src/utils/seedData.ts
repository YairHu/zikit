import { db } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { Soldier } from '../models/Soldier';
import { Vehicle } from '../models/Vehicle';

// נתוני חיילים דמו
export const demoSoldiers: Omit<Soldier, 'id'>[] = [
  // מפקדי פלוגה
  {
    name: 'מפקד פלוגה',
    personalNumber: '1000001',
    team: 'מפקדה',
    role: 'מפקד פלוגה',
    profile: '97',
    qualifications: ['פיקוד', 'ניווט', 'קשר'],
    licenses: ['B', 'C'],
    certifications: ['קורס מפקדי פלוגות'],
    framework: {
      pluga: 'פלוגה א',
      pelaga: 'פלגה א',
      miflag: 'מפלג א',
      tzevet: 'מפקדה'
    },
    commanders: {
      mefakedTzevet: '',
      mefakedMiflag: '',
      samal: 'סגן מפקד פלוגה',
      mefakedPluga: ''
    }
  },
  {
    name: 'סגן מפקד פלוגה',
    personalNumber: '1000002',
    team: 'מפקדה',
    role: 'סגן מפקד פלוגה',
    profile: '97',
    qualifications: ['פיקוד', 'ניווט', 'קשר'],
    licenses: ['B', 'C'],
    certifications: ['קורס מפקדי צוותים'],
  },
  {
    name: 'מפקד פלגה א',
    personalNumber: '1000003',
    team: 'פלגה א',
    role: 'מפקד פלגה',
    profile: '97',
    qualifications: ['פיקוד', 'ניווט', 'קשר'],
    licenses: ['B', 'C'],
    certifications: ['קורס מפקדי צוותים'],
  },
  {
    name: 'מפקד פלגה ב',
    personalNumber: '1000004',
    team: 'פלגה ב',
    role: 'מפקד פלגה',
    profile: '97',
    qualifications: ['פיקוד', 'ניווט', 'קשר'],
    licenses: ['B', 'C'],
    certifications: ['קורס מפקדי צוותים'],
  },
  {
    name: 'מפקד פלגה זווית',
    personalNumber: '1000005',
    team: 'פלגה זווית',
    role: 'מפקד פלגה',
    profile: '97',
    qualifications: ['פיקוד', 'ניווט', 'קשר'],
    licenses: ['B', 'C'],
    certifications: ['קורס מפקדי צוותים'],
  },
  
  // מפל"ג
  {
    name: 'רספ',
    personalNumber: '1000006',
    team: 'מפקדה',
    role: 'רספ',
    profile: '97',
    qualifications: ['פיקוד', 'קשר', 'טכנולוג'],
    licenses: ['B'],
    certifications: ['קורס רספ'],
  },
  {
    name: 'סרספ',
    personalNumber: '1000007',
    team: 'מפקדה',
    role: 'סרספ',
    profile: '97',
    qualifications: ['פיקוד', 'קשר', 'טכנולוג'],
    licenses: ['B'],
    certifications: ['קורס סרספ'],
  },
  {
    name: 'קצין ניהול',
    personalNumber: '1000008',
    team: 'מפקדה',
    role: 'קצין ניהול',
    profile: '97',
    qualifications: ['פיקוד', 'קשר', 'בנאי'],
    licenses: ['B'],
    certifications: ['קורס קציני ניהול'],
  },
  {
    name: 'מניפ',
    personalNumber: '1000009',
    team: 'מפקדה',
    role: 'מניפ',
    profile: '97',
    qualifications: ['פיקוד', 'קשר', 'טכנולוג'],
    licenses: ['B'],
    certifications: ['קורס מניפ'],
  },
  {
    name: 'חופל',
    personalNumber: '1000010',
    team: 'מפקדה',
    role: 'חופל',
    profile: '97',
    qualifications: ['פיקוד', 'קשר', 'טכנולוג'],
    licenses: ['B'],
    certifications: ['קורס חופל'],
  },
  {
    name: 'פפ',
    personalNumber: '1000011',
    team: 'מפקדה',
    role: 'פפ',
    profile: '97',
    qualifications: ['פיקוד', 'קשר', 'טכנולוג'],
    licenses: ['B'],
    certifications: ['קורס פפ'],
  },
  {
    name: 'סמל רכבים',
    personalNumber: '1000012',
    team: 'מפקדה',
    role: 'סמל רכבים',
    profile: '97',
    qualifications: ['פיקוד', 'קשר', 'טכנולוג'],
    licenses: ['B'],
    certifications: ['קורס סמלים'],
  },
  {
    name: 'סמל רפואה',
    personalNumber: '1000013',
    team: 'מפקדה',
    role: 'סמל רפואה',
    profile: '97',
    qualifications: ['פיקוד', 'קשר', 'חובש'],
    licenses: ['B'],
    certifications: ['קורס סמלים'],
  },
  {
    name: 'סמל לוגיסטיקה',
    personalNumber: '1000014',
    team: 'מפקדה',
    role: 'סמל לוגיסטיקה',
    profile: '97',
    qualifications: ['פיקוד', 'קשר', 'בנאי'],
    licenses: ['B'],
    certifications: ['קורס סמלים'],
  },
  
  // צוות 10
  {
    name: 'מפקד צוות 10',
    personalNumber: '1000015',
    team: 'צוות 10',
    role: 'מפקד צוות',
    profile: '97',
    qualifications: ['פיקוד', 'ניווט', 'קשר'],
    licenses: ['B'],
    certifications: ['קורס מפקדי צוותים'],
  },
  {
    name: 'סמל צוות 10',
    personalNumber: '1000016',
    team: 'צוות 10',
    role: 'סמל',
    profile: '97',
    qualifications: ['פיקוד', 'קשר', 'חובש'],
    licenses: ['B'],
    certifications: ['קורס סמלים'],
  },
  {
    name: 'מפקד 1 צוות 10',
    personalNumber: '1000017',
    team: 'צוות 10',
    role: 'מפקד',
    profile: '97',
    qualifications: ['פיקוד', 'קשר', 'קלע'],
    licenses: ['B'],
    certifications: ['קורס מפקדים'],
  },
  {
    name: 'מפקד 2 צוות 10',
    personalNumber: '1000018',
    team: 'צוות 10',
    role: 'מפקד',
    profile: '97',
    qualifications: ['פיקוד', 'קשר', 'נגביסט'],
    licenses: ['B'],
    certifications: ['קורס מפקדים'],
  },
  {
    name: 'חייל 1 צוות 10',
    personalNumber: '1000019',
    team: 'צוות 10',
    role: 'חייל',
    profile: '97',
    qualifications: ['רוגר', 'נהג', 'חובש'],
    licenses: ['B', 'C'],
    certifications: ['הסמכת רוגר'],
    drivingLicenses: ['35', 'דימקס'],
  },
  {
    name: 'חייל 2 צוות 10',
    personalNumber: '1000020',
    team: 'צוות 10',
    role: 'חייל',
    profile: '97',
    qualifications: ['קלע', 'צלם', 'מטמין'],
    licenses: ['B'],
    certifications: ['הסמכת קלע'],
  },
  {
    name: 'חייל 3 צוות 10',
    personalNumber: '1000021',
    team: 'צוות 10',
    role: 'חייל',
    profile: '97',
    qualifications: ['טכנולוג', 'בנאי', 'רחפניסט'],
    licenses: ['B'],
    certifications: ['הסמכת טכנולוג'],
  },
  {
    name: 'חייל 4 צוות 10',
    personalNumber: '1000022',
    team: 'צוות 10',
    role: 'חייל',
    profile: '97',
    qualifications: ['קשר', 'נגביסט', 'צלם'],
    licenses: ['B'],
    certifications: ['הסמכת קשר'],
  },
  {
    name: 'חייל 5 צוות 10',
    personalNumber: '1000023',
    team: 'צוות 10',
    role: 'חייל',
    profile: '97',
    qualifications: ['נהג', 'חובש', 'קלע'],
    licenses: ['B', 'C'],
    certifications: ['קורס נהגים'],
    drivingLicenses: ['סוואנה', 'C'],
  },
  
  // צוות 20
  {
    name: 'מפקד צוות 20',
    personalNumber: '1000024',
    team: 'צוות 20',
    role: 'מפקד צוות',
    profile: '97',
    qualifications: ['פיקוד', 'ניווט', 'קשר'],
    licenses: ['B'],
    certifications: ['קורס מפקדי צוותים'],
  },
  {
    name: 'סמל צוות 20',
    personalNumber: '1000025',
    team: 'צוות 20',
    role: 'סמל',
    profile: '97',
    qualifications: ['פיקוד', 'קשר', 'חובש'],
    licenses: ['B'],
    certifications: ['קורס סמלים'],
  },
  {
    name: 'מפקד 1 צוות 20',
    personalNumber: '1000026',
    team: 'צוות 20',
    role: 'מפקד',
    profile: '97',
    qualifications: ['פיקוד', 'קשר', 'קלע'],
    licenses: ['B'],
    certifications: ['קורס מפקדים'],
  },
  {
    name: 'מפקד 2 צוות 20',
    personalNumber: '1000027',
    team: 'צוות 20',
    role: 'מפקד',
    profile: '97',
    qualifications: ['פיקוד', 'קשר', 'נגביסט'],
    licenses: ['B'],
    certifications: ['קורס מפקדים'],
  },
  {
    name: 'חייל 1 צוות 20',
    personalNumber: '1000028',
    team: 'צוות 20',
    role: 'חייל',
    profile: '97',
    qualifications: ['רוגר', 'נהג', 'חובש'],
    licenses: ['B', 'C'],
    certifications: ['הסמכת רוגר'],
    drivingLicenses: ['35', 'דימקס', 'סוואנה'],
  },
  {
    name: 'חייל 2 צוות 20',
    personalNumber: '1000029',
    team: 'צוות 20',
    role: 'חייל',
    profile: '97',
    qualifications: ['קלע', 'צלם', 'מטמין'],
    licenses: ['B'],
    certifications: ['הסמכת קלע'],
  },
  {
    name: 'חייל 3 צוות 20',
    personalNumber: '1000030',
    team: 'צוות 20',
    role: 'חייל',
    profile: '97',
    qualifications: ['טכנולוג', 'בנאי', 'רחפניסט'],
    licenses: ['B'],
    certifications: ['הסמכת טכנולוג'],
  },
  {
    name: 'חייל 4 צוות 20',
    personalNumber: '1000031',
    team: 'צוות 20',
    role: 'חייל',
    profile: '97',
    qualifications: ['קשר', 'נגביסט', 'צלם'],
    licenses: ['B'],
    certifications: ['הסמכת קשר'],
  },
  {
    name: 'חייל 5 צוות 20',
    personalNumber: '1000032',
    team: 'צוות 20',
    role: 'חייל',
    profile: '97',
    qualifications: ['נהג', 'חובש', 'קלע'],
    licenses: ['B', 'C'],
    certifications: ['קורס נהגים'],
    drivingLicenses: ['35', 'C'],
  },
  
  // צוות 30
  {
    name: 'מפקד צוות 30',
    personalNumber: '1000033',
    team: 'צוות 30',
    role: 'מפקד צוות',
    profile: '97',
    qualifications: ['פיקוד', 'ניווט', 'קשר'],
    licenses: ['B'],
    certifications: ['קורס מפקדי צוותים'],
  },
  {
    name: 'סמל צוות 30',
    personalNumber: '1000034',
    team: 'צוות 30',
    role: 'סמל',
    profile: '97',
    qualifications: ['פיקוד', 'קשר', 'חובש'],
    licenses: ['B'],
    certifications: ['קורס סמלים'],
  },
  {
    name: 'מפקד 1 צוות 30',
    personalNumber: '1000035',
    team: 'צוות 30',
    role: 'מפקד',
    profile: '97',
    qualifications: ['פיקוד', 'קשר', 'קלע'],
    licenses: ['B'],
    certifications: ['קורס מפקדים'],
  },
  {
    name: 'מפקד 2 צוות 30',
    personalNumber: '1000036',
    team: 'צוות 30',
    role: 'מפקד',
    profile: '97',
    qualifications: ['פיקוד', 'קשר', 'נגביסט'],
    licenses: ['B'],
    certifications: ['קורס מפקדים'],
  },
  {
    name: 'חייל 1 צוות 30',
    personalNumber: '1000037',
    team: 'צוות 30',
    role: 'חייל',
    profile: '97',
    qualifications: ['רוגר', 'נהג', 'חובש'],
    licenses: ['B', 'C'],
    certifications: ['הסמכת רוגר'],
    drivingLicenses: ['דימקס', 'סוואנה'],
  },
  {
    name: 'חייל 2 צוות 30',
    personalNumber: '1000038',
    team: 'צוות 30',
    role: 'חייל',
    profile: '97',
    qualifications: ['קלע', 'צלם', 'מטמין'],
    licenses: ['B'],
    certifications: ['הסמכת קלע'],
  },
  {
    name: 'חייל 3 צוות 30',
    personalNumber: '1000039',
    team: 'צוות 30',
    role: 'חייל',
    profile: '97',
    qualifications: ['טכנולוג', 'בנאי', 'רחפניסט'],
    licenses: ['B'],
    certifications: ['הסמכת טכנולוג'],
  },
  {
    name: 'חייל 4 צוות 30',
    personalNumber: '1000040',
    team: 'צוות 30',
    role: 'חייל',
    profile: '97',
    qualifications: ['קשר', 'נגביסט', 'צלם'],
    licenses: ['B'],
    certifications: ['הסמכת קשר'],
  },
  {
    name: 'חייל 5 צוות 30',
    personalNumber: '1000041',
    team: 'צוות 30',
    role: 'חייל',
    profile: '97',
    qualifications: ['נהג', 'חובש', 'קלע'],
    licenses: ['B', 'C'],
    certifications: ['קורס נהגים'],
    drivingLicenses: ['35', 'דימקס'],
  },
  
  // צוות 40
  {
    name: 'מפקד צוות 40',
    personalNumber: '1000042',
    team: 'צוות 40',
    role: 'מפקד צוות',
    profile: '97',
    qualifications: ['פיקוד', 'ניווט', 'קשר'],
    licenses: ['B'],
    certifications: ['קורס מפקדי צוותים'],
  },
  {
    name: 'סמל צוות 40',
    personalNumber: '1000043',
    team: 'צוות 40',
    role: 'סמל',
    profile: '97',
    qualifications: ['פיקוד', 'קשר', 'חובש'],
    licenses: ['B'],
    certifications: ['קורס סמלים'],
  },
  {
    name: 'מפקד 1 צוות 40',
    personalNumber: '1000044',
    team: 'צוות 40',
    role: 'מפקד',
    profile: '97',
    qualifications: ['פיקוד', 'קשר', 'קלע'],
    licenses: ['B'],
    certifications: ['קורס מפקדים'],
  },
  {
    name: 'מפקד 2 צוות 40',
    personalNumber: '1000045',
    team: 'צוות 40',
    role: 'מפקד',
    profile: '97',
    qualifications: ['פיקוד', 'קשר', 'נגביסט'],
    licenses: ['B'],
    certifications: ['קורס מפקדים'],
  },
  {
    name: 'חייל 1 צוות 40',
    personalNumber: '1000046',
    team: 'צוות 40',
    role: 'חייל',
    profile: '97',
    qualifications: ['מטמין', 'טכנולוג', 'בנאי'],
    licenses: ['B'],
    certifications: ['הסמכת מטמין'],
  },
  {
    name: 'חייל 2 צוות 40',
    personalNumber: '1000047',
    team: 'צוות 40',
    role: 'חייל',
    profile: '97',
    qualifications: ['רחפניסט', 'קשר', 'רוגר'],
    licenses: ['B'],
    certifications: ['הסמכת רחפניסט'],
  },
  {
    name: 'חייל 3 צוות 40',
    personalNumber: '1000048',
    team: 'צוות 40',
    role: 'חייל',
    profile: '97',
    qualifications: ['נהג', 'קשר', 'קלע'],
    licenses: ['B', 'C'],
    certifications: ['קורס נהגים'],
    drivingLicenses: ['סוואנה', 'C'],
  },
  {
    name: 'חייל 4 צוות 40',
    personalNumber: '1000049',
    team: 'צוות 40',
    role: 'חייל',
    profile: '97',
    qualifications: ['נגביסט', 'צלם', 'מטמין'],
    licenses: ['B'],
    certifications: ['הסמכת נגביסט'],
  },
  {
    name: 'חייל 5 צוות 40',
    personalNumber: '1000050',
    team: 'צוות 40',
    role: 'חייל',
    profile: '97',
    qualifications: ['חובש', 'טכנולוג', 'בנאי'],
    licenses: ['B'],
    certifications: ['הסמכת חובש'],
  },
  
  // צוות 50
  {
    name: 'מפקד צוות 50',
    personalNumber: '1000051',
    team: 'צוות 50',
    role: 'מפקד צוות',
    profile: '97',
    qualifications: ['פיקוד', 'ניווט', 'קשר'],
    licenses: ['B'],
    certifications: ['קורס מפקדי צוותים'],
  },
  {
    name: 'סמל צוות 50',
    personalNumber: '1000052',
    team: 'צוות 50',
    role: 'סמל',
    profile: '97',
    qualifications: ['פיקוד', 'קשר', 'חובש'],
    licenses: ['B'],
    certifications: ['קורס סמלים'],
  },
  {
    name: 'מפקד 1 צוות 50',
    personalNumber: '1000053',
    team: 'צוות 50',
    role: 'מפקד',
    profile: '97',
    qualifications: ['פיקוד', 'קשר', 'קלע'],
    licenses: ['B'],
    certifications: ['קורס מפקדים'],
  },
  {
    name: 'מפקד 2 צוות 50',
    personalNumber: '1000054',
    team: 'צוות 50',
    role: 'מפקד',
    profile: '97',
    qualifications: ['פיקוד', 'קשר', 'נגביסט'],
    licenses: ['B'],
    certifications: ['קורס מפקדים'],
  },
  {
    name: 'חייל 1 צוות 50',
    personalNumber: '1000055',
    team: 'צוות 50',
    role: 'חייל',
    profile: '97',
    qualifications: ['רוגר', 'נהג', 'חובש'],
    licenses: ['B', 'C'],
    certifications: ['הסמכת רוגר'],
    drivingLicenses: ['35', 'דימקס', 'סוואנה'],
  },
  {
    name: 'חייל 2 צוות 50',
    personalNumber: '1000056',
    team: 'צוות 50',
    role: 'חייל',
    profile: '97',
    qualifications: ['קלע', 'צלם', 'מטמין'],
    licenses: ['B'],
    certifications: ['הסמכת קלע'],
  },
  {
    name: 'חייל 3 צוות 50',
    personalNumber: '1000057',
    team: 'צוות 50',
    role: 'חייל',
    profile: '97',
    qualifications: ['טכנולוג', 'בנאי', 'רחפניסט'],
    licenses: ['B'],
    certifications: ['הסמכת טכנולוג'],
  },
  {
    name: 'חייל 4 צוות 50',
    personalNumber: '1000058',
    team: 'צוות 50',
    role: 'חייל',
    profile: '97',
    qualifications: ['קשר', 'נגביסט', 'צלם'],
    licenses: ['B'],
    certifications: ['הסמכת קשר'],
  },
  {
    name: 'חייל 5 צוות 50',
    personalNumber: '1000059',
    team: 'צוות 50',
    role: 'חייל',
    profile: '97',
    qualifications: ['נהג', 'חובש', 'קלע'],
    licenses: ['B', 'C'],
    certifications: ['קורס נהגים'],
    drivingLicenses: ['C'],
  },
  
  // פלגה זווית אחרת
  {
    name: 'נגד טכנולוגיה',
    personalNumber: '1000060',
    team: 'פלגה זווית',
    role: 'נגד טכנולוגיה',
    profile: '97',
    qualifications: ['טכנולוג', 'קשר', 'רחפניסט'],
    licenses: ['B'],
    certifications: ['קורס נגדי טכנולוגיה'],
  },
  {
    name: 'נגד הסוואה',
    personalNumber: '1000061',
    team: 'פלגה זווית',
    role: 'נגד הסוואה',
    profile: '97',
    qualifications: ['הסוואה', 'קשר', 'צלם'],
    licenses: ['B'],
    certifications: ['קורס נגדי הסוואה'],
  },
  {
    name: 'משק טכנולוגיה',
    personalNumber: '1000062',
    team: 'פלגה זווית',
    role: 'משק טכנולוגיה',
    profile: '97',
    qualifications: ['טכנולוג', 'קשר', 'רחפניסט'],
    licenses: ['B'],
    certifications: ['קורס משקי טכנולוגיה'],
  },
  {
    name: 'משק הסוואה',
    personalNumber: '1000063',
    team: 'פלגה זווית',
    role: 'משק הסוואה',
    profile: '97',
    qualifications: ['הסוואה', 'קשר', 'צלם'],
    licenses: ['B'],
    certifications: ['קורס משקי הסוואה'],
  },
  {
    name: 'סמלת מדור',
    personalNumber: '1000064',
    team: 'פלגה זווית',
    role: 'סמלת מדור',
    profile: '97',
    qualifications: ['פיקוד', 'קשר', 'חובש'],
    licenses: ['B'],
    certifications: ['קורס סמלים'],
  }
];

// נתוני רכבים דמו
export const demoVehicles: Omit<Vehicle, 'id'>[] = [
  // 3 רכבים מסוג סוואנה
  {
    type: 'סוואנה',
    number: '12-345-67',
    mileage: 85000,
    lastMaintenance: '2024-01-15',
    nextMaintenance: '2024-04-15',
    status: 'available'
  },
  {
    type: 'סוואנה',
    number: '12-345-68',
    mileage: 92000,
    lastMaintenance: '2024-01-20',
    nextMaintenance: '2024-04-20',
    status: 'available'
  },
  {
    type: 'סוואנה',
    number: '12-345-69',
    mileage: 78000,
    lastMaintenance: '2023-12-10',
    nextMaintenance: '2024-03-10',
    status: 'maintenance'
  },
  
  // 1 זאב
  {
    type: 'זאב',
    number: '12-345-70',
    mileage: 65000,
    lastMaintenance: '2024-01-25',
    nextMaintenance: '2024-04-25',
    status: 'available'
  },
  
  // 2 רכבי דוד
  {
    type: 'דוד',
    number: '12-345-71',
    mileage: 120000,
    lastMaintenance: '2024-01-05',
    nextMaintenance: '2024-04-05',
    status: 'available'
  },
  {
    type: 'דוד',
    number: '12-345-72',
    mileage: 95000,
    lastMaintenance: '2024-01-12',
    nextMaintenance: '2024-04-12',
    status: 'on_mission'
  },
  
  // 1 דימקס אפורה
  {
    type: 'דימקס אפורה',
    number: '12-345-73',
    mileage: 110000,
    lastMaintenance: '2024-01-08',
    nextMaintenance: '2024-04-08',
    status: 'available'
  },
  
  // 1 דימקס לבנה
  {
    type: 'דימקס לבנה',
    number: '12-345-74',
    mileage: 88000,
    lastMaintenance: '2024-01-18',
    nextMaintenance: '2024-04-18',
    status: 'available'
  },
  
  // 1 סופה
  {
    type: 'סופה',
    number: '12-345-75',
    mileage: 72000,
    lastMaintenance: '2024-01-30',
    nextMaintenance: '2024-04-30',
    status: 'available'
  }
];

// פונקציות להכנסת נתונים
export const seedSoldiers = async () => {
  try {
    console.log('מתחיל הכנסת נתוני חיילים...');
    
    // מחיקת נתונים קיימים
    const existingSoldiers = await getDocs(collection(db, 'soldiers'));
    for (const doc of existingSoldiers.docs) {
      await deleteDoc(doc.ref);
    }
    console.log('נמחקו נתונים קיימים');
    
    // הכנסת נתונים חדשים
    for (const soldier of demoSoldiers) {
      await addDoc(collection(db, 'soldiers'), soldier);
    }
    
    console.log(`הוכנסו ${demoSoldiers.length} חיילים בהצלחה`);
    return true;
  } catch (error) {
    console.error('שגיאה בהכנסת נתוני חיילים:', error);
    return false;
  }
};

export const seedVehicles = async () => {
  try {
    console.log('מתחיל הכנסת נתוני רכבים...');
    
    // מחיקת נתונים קיימים
    const existingVehicles = await getDocs(collection(db, 'vehicles'));
    for (const doc of existingVehicles.docs) {
      await deleteDoc(doc.ref);
    }
    console.log('נמחקו נתונים קיימים');
    
    // הכנסת נתונים חדשים
    for (const vehicle of demoVehicles) {
      await addDoc(collection(db, 'vehicles'), vehicle);
    }
    
    console.log(`הוכנסו ${demoVehicles.length} רכבים בהצלחה`);
    return true;
  } catch (error) {
    console.error('שגיאה בהכנסת נתוני רכבים:', error);
    return false;
  }
};

export const seedAllData = async () => {
  console.log('מתחיל הכנסת כל נתוני הדמו...');
  
  const soldiersResult = await seedSoldiers();
  const vehiclesResult = await seedVehicles();
  
  if (soldiersResult && vehiclesResult) {
    console.log('כל הנתונים הוכנסו בהצלחה!');
    return true;
  } else {
    console.error('הייתה שגיאה בהכנסת הנתונים');
    return false;
  }
}; 