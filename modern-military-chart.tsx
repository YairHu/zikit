import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Users, Crown, Shield, Star } from 'lucide-react';

// נתוני דוגמה
const mockData = {
  frameworks: [
    { id: '1', name: 'פלוגה א', level: 'COMPANY', parentFrameworkId: null, commanderId: '1' },
    { id: '2', name: 'מחלקה 1', level: 'PLATOON', parentFrameworkId: '1', commanderId: '2' },
    { id: '3', name: 'מחלקה 2', level: 'PLATOON', parentFrameworkId: '1', commanderId: '3' },
    { id: '4', name: 'צוות א', level: 'TEAM', parentFrameworkId: '2', commanderId: '4' },
    { id: '5', name: 'צוות ב', level: 'TEAM', parentFrameworkId: '2', commanderId: '5' },
    { id: '6', name: 'צוות ג', level: 'TEAM', parentFrameworkId: '3', commanderId: '6' },
  ],
  soldiers: [
    { id: '1', name: 'אבי כהן', personalNumber: '1001', frameworkId: '1', role: 'מפקד פלוגה', presence: 'בבסיס' },
    { id: '2', name: 'דני לוי', personalNumber: '1002', frameworkId: '2', role: 'מפקד מחלקה', presence: 'בפעילות' },
    { id: '3', name: 'משה ישראל', personalNumber: '1003', frameworkId: '3', role: 'מפקד מחלקה', presence: 'בבסיס' },
    { id: '4', name: 'יוסי שלום', personalNumber: '1004', frameworkId: '4', role: 'מפקד צוות', presence: 'בחופש' },
    { id: '5', name: 'רון אברהם', personalNumber: '1005', frameworkId: '5', role: 'מפקד צוות', presence: 'בבסיס' },
    { id: '6', name: 'עמית דוד', personalNumber: '1006', frameworkId: '6', role: 'מפקד צוות', presence: 'בתורנות' },
    { id: '7', name: 'אלון מור', personalNumber: '1007', frameworkId: '4', role: 'חייל', presence: 'בבסיס' },
    { id: '8', name: 'גל רוזן', personalNumber: '1008', frameworkId: '4', role: 'חייל', presence: 'בפעילות' },
    { id: '9', name: 'תום שמיר', personalNumber: '1009', frameworkId: '5', role: 'חייל', presence: 'בבסיס' },
    { id: '10', name: 'איתי נחום', personalNumber: '1010', frameworkId: '5', role: 'רסק', presence: 'בחופש' },
    { id: '11', name: 'נועם כץ', personalNumber: '1011', frameworkId: '6', role: 'חייל', presence: 'בבסיס' },
    { id: '12', name: 'רועי גולד', personalNumber: '1012', frameworkId: '6', role: 'סמל', presence: 'בתורנות' },
  ]
};

const ModernMilitaryChart = () => {
  const [expandedFrameworks, setExpandedFrameworks] = useState(new Set(['1', '2', '3']));
  const [showSoldiers, setShowSoldiers] = useState(true);

  // פונקציות עזר
  const getFrameworkColor = (level) => {
    const colors = {
      COMPANY: 'bg-gradient-to-br from-red-500 to-red-600',
      PLATOON: 'bg-gradient-to-br from-blue-500 to-blue-600',
      TEAM: 'bg-gradient-to-br from-green-500 to-green-600',
      SQUAD: 'bg-gradient-to-br from-orange-500 to-orange-600'
    };
    return colors[level] || 'bg-gradient-to-br from-gray-500 to-gray-600';
  };

  const getPresenceColor = (presence) => {
    const colors = {
      'בבסיס': 'bg-green-100 text-green-800 border-green-200',
      'בפעילות': 'bg-blue-100 text-blue-800 border-blue-200',
      'בחופש': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'בתורנות': 'bg-purple-100 text-purple-800 border-purple-200',
      'במנוחה': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[presence] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getRoleIcon = (role) => {
    if (role.includes('מפקד')) return <Crown className="w-4 h-4 text-yellow-400" />;
    if (role.includes('סמל')) return <Shield className="w-4 h-4 text-blue-400" />;
    if (role.includes('רסק')) return <Star className="w-4 h-4 text-purple-400" />;
    return <Users className="w-4 h-4 text-gray-400" />;
  };

  const buildHierarchy = () => {
    const frameworkMap = new Map();
    mockData.frameworks.forEach(f => frameworkMap.set(f.id, { ...f, children: [] }));
    
    // בניית עץ היררכי
    const roots = [];
    mockData.frameworks.forEach(framework => {
      const f = frameworkMap.get(framework.id);
      if (framework.parentFrameworkId) {
        const parent = frameworkMap.get(framework.parentFrameworkId);
        if (parent) parent.children.push(f);
      } else {
        roots.push(f);
      }
    });
    
    return roots;
  };

  const getFrameworkSoldiers = (frameworkId) => {
    return mockData.soldiers.filter(s => s.frameworkId === frameworkId);
  };

  const getCommanderName = (commanderId) => {
    const commander = mockData.soldiers.find(s => s.id === commanderId);
    return commander ? commander.name : 'לא מוגדר';
  };

  const toggleFramework = (frameworkId) => {
    const newExpanded = new Set(expandedFrameworks);
    if (newExpanded.has(frameworkId)) {
      newExpanded.delete(frameworkId);
    } else {
      newExpanded.add(frameworkId);
    }
    setExpandedFrameworks(newExpanded);
  };

  const FrameworkNode = ({ framework, level = 0 }) => {
    const soldiers = getFrameworkSoldiers(framework.id);
    const commanderName = getCommanderName(framework.commanderId);
    const isExpanded = expandedFrameworks.has(framework.id);
    const hasChildren = framework.children.length > 0;
    const hasSoldiers = soldiers.length > 0;

    // חלוקת חיילים לסטף ורגילים
    const staffSoldiers = soldiers.filter(s => 
      s.role.includes('מפקד') || s.role.includes('סמל') || s.role.includes('רסק')
    );
    const regularSoldiers = soldiers.filter(s => 
      !s.role.includes('מפקד') && !s.role.includes('סמל') && !s.role.includes('רסק')
    );

    return (
      <div className="relative">
        {/* קו חיבור */}
        {level > 0 && (
          <div className="absolute -top-8 left-1/2 w-0.5 h-8 bg-gray-300 transform -translate-x-1/2"></div>
        )}
        
        <div className={`inline-block ${level > 0 ? 'mt-8' : ''}`}>
          {/* קופסת המסגרת */}
          <div 
            className={`
              ${getFrameworkColor(framework.level)} 
              rounded-xl shadow-lg p-4 text-white cursor-pointer
              transform transition-all duration-200 hover:scale-105 hover:shadow-xl
              min-w-64 max-w-80
            `}
            onClick={() => hasChildren && toggleFramework(framework.id)}
          >
            {/* כותרת המסגרת */}
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold">{framework.name}</h3>
              {hasChildren && (
                <div className="flex items-center">
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              )}
            </div>

            {/* מפקד */}
            <div className="flex items-center gap-2 mb-3 bg-black bg-opacity-20 rounded-lg p-2">
              <Crown className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium">מפקד: {commanderName}</span>
            </div>

            {/* מידע נוסף */}
            <div className="flex items-center justify-between text-xs opacity-90">
              <span>{soldiers.length} חיילים</span>
              <span>{framework.children.length} יחידות משנה</span>
            </div>

            {/* אזור חיילים */}
            {showSoldiers && hasSoldiers && (
              <div className="mt-4 space-y-3">
                {/* סטף */}
                {staffSoldiers.length > 0 && (
                  <div className="bg-black bg-opacity-20 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm font-bold">סגל ({staffSoldiers.length})</span>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5">
                      {staffSoldiers.slice(0, 3).map(soldier => (
                        <div 
                          key={soldier.id}
                          className="flex items-center justify-between bg-white bg-opacity-10 rounded p-2"
                        >
                          <div className="flex items-center gap-2">
                            {getRoleIcon(soldier.role)}
                            <span className="text-xs font-medium">{soldier.name}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getPresenceColor(soldier.presence)}`}>
                            {soldier.presence}
                          </span>
                        </div>
                      ))}
                      {staffSoldiers.length > 3 && (
                        <div className="text-xs text-center opacity-75">
                          +{staffSoldiers.length - 3} נוספים...
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* חיילים רגילים */}
                {regularSoldiers.length > 0 && (
                  <div className="bg-black bg-opacity-10 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-gray-300" />
                      <span className="text-sm font-bold">חיילים ({regularSoldiers.length})</span>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5">
                      {regularSoldiers.slice(0, 4).map(soldier => (
                        <div 
                          key={soldier.id}
                          className="flex items-center justify-between bg-white bg-opacity-5 rounded p-2"
                        >
                          <div className="flex items-center gap-2">
                            {getRoleIcon(soldier.role)}
                            <span className="text-xs">{soldier.name}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getPresenceColor(soldier.presence)}`}>
                            {soldier.presence}
                          </span>
                        </div>
                      ))}
                      {regularSoldiers.length > 4 && (
                        <div className="text-xs text-center opacity-75">
                          +{regularSoldiers.length - 4} נוספים...
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* יחידות משנה */}
          {hasChildren && isExpanded && (
            <div className="mt-8">
              <div className="flex flex-wrap gap-8 justify-center">
                {framework.children.map((child, index) => (
                  <div key={child.id} className="relative">
                    {/* קו חיבור אנכי */}
                    {index === 0 && (
                      <div className="absolute -top-8 left-1/2 w-0.5 h-8 bg-gray-300 transform -translate-x-1/2"></div>
                    )}
                    {/* קווי חיבור אופקיים */}
                    {framework.children.length > 1 && (
                      <>
                        <div className="absolute -top-8 left-1/2 w-full h-0.5 bg-gray-300 transform -translate-x-1/2"></div>
                        <div className="absolute -top-8 left-1/2 w-0.5 h-4 bg-gray-300 transform -translate-x-1/2"></div>
                      </>
                    )}
                    <FrameworkNode framework={child} level={level + 1} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const hierarchy = buildHierarchy();

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen" dir="rtl">
      {/* כותרת וכפתורי בקרה */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">תרשים ארגוני - פלוגה א</h1>
        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={() => setShowSoldiers(!showSoldiers)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              showSoldiers 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'bg-white text-blue-600 border border-blue-300 hover:bg-blue-50'
            }`}
          >
            {showSoldiers ? 'הסתר חיילים' : 'הצג חיילים'}
          </button>
          <button
            onClick={() => setExpandedFrameworks(new Set(mockData.frameworks.map(f => f.id)))}
            className="px-4 py-2 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 shadow-md transition-colors"
          >
            הרחב הכל
          </button>
          <button
            onClick={() => setExpandedFrameworks(new Set(['1']))}
            className="px-4 py-2 rounded-lg font-medium bg-gray-600 text-white hover:bg-gray-700 shadow-md transition-colors"
          >
            צמצם הכל
          </button>
        </div>

        {/* מקרא */}
        <div className="flex flex-wrap gap-4 justify-center text-sm">
          <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg shadow-sm">
            <div className="w-4 h-4 bg-gradient-to-br from-red-500 to-red-600 rounded"></div>
            <span>פלוגה</span>
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg shadow-sm">
            <div className="w-4 h-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded"></div>
            <span>מחלקה</span>
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg shadow-sm">
            <div className="w-4 h-4 bg-gradient-to-br from-green-500 to-green-600 rounded"></div>
            <span>צוות</span>
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg shadow-sm">
            <Crown className="w-4 h-4 text-yellow-600" />
            <span>מפקד</span>
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg shadow-sm">
            <Shield className="w-4 h-4 text-blue-600" />
            <span>סמל</span>
          </div>
        </div>
      </div>

      {/* התרשים */}
      <div className="flex justify-center overflow-x-auto">
        <div className="inline-block">
          {hierarchy.map(framework => (
            <FrameworkNode key={framework.id} framework={framework} />
          ))}
        </div>
      </div>

      {/* סטטיסטיקות */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{mockData.frameworks.length}</div>
          <div className="text-sm text-gray-600">מסגרות</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{mockData.soldiers.length}</div>
          <div className="text-sm text-gray-600">חיילים</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {mockData.soldiers.filter(s => s.presence === 'בבסיס').length}
          </div>
          <div className="text-sm text-gray-600">בבסיס</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {mockData.soldiers.filter(s => s.presence === 'בפעילות').length}
          </div>
          <div className="text-sm text-gray-600">בפעילות</div>
        </div>
      </div>
    </div>
  );
};

export default ModernMilitaryChart;