import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { Box, Typography, Alert, CircularProgress, useTheme, useMediaQuery } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Framework } from '../models/Framework';
import { Soldier } from '../models/Soldier';

interface HierarchicalChartProps {
  frameworks: Framework[];
  soldiers: Soldier[];
  loading?: boolean;
}

interface ChartNode {
  name: string;
  level: string;
  frameworkId?: string;
  soldierId?: string;
  children?: ChartNode[];
  soldier?: Soldier;
  framework?: Framework;
  commander?: Soldier;
  soldiersInFramework?: Soldier[];
}

const HierarchicalChart: React.FC<HierarchicalChartProps> = ({ 
  frameworks, 
  soldiers, 
  loading = false 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [chartData, setChartData] = useState<ChartNode | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();

  // יצירת מבנה היררכי מהנתונים
  const buildHierarchicalData = useCallback((): ChartNode | null => {
    if (frameworks.length === 0 || soldiers.length === 0) return null;

    // יצירת מפה של מסגרות לפי ID
    const frameworkMap = new Map<string, Framework>();
    frameworks.forEach(framework => {
      frameworkMap.set(framework.id, framework);
    });

    // מציאת מסגרות שורש (ללא הורה)
    const rootFrameworks = frameworks.filter(f => !f.parentFrameworkId);

    if (rootFrameworks.length === 0) return null;

    // פונקציה רקורסיבית לבניית העץ
    const buildTree = (framework: Framework): ChartNode => {
      const frameworkSoldiers = soldiers.filter(s => s.frameworkId === framework.id);
      const childFrameworks = frameworks.filter(f => f.parentFrameworkId === framework.id);
      
      // מציאת מפקד המסגרת
      const commander = frameworkSoldiers.find(s => s.id === framework.commanderId);

      // יצירת ילדים - רק מסגרות בנות (לא חיילים)
      const children: ChartNode[] = [];

      // הוספת מסגרות בנות
      childFrameworks.forEach(childFramework => {
        children.push(buildTree(childFramework));
      });

      return {
        name: framework.name,
        level: getFrameworkLevel(framework.name),
        frameworkId: framework.id,
        framework: framework,
        commander: commander,
        soldiersInFramework: frameworkSoldiers,
        children: children.length > 0 ? children : undefined
      };
    };

    // אם יש רק מסגרת שורש אחת, השתמש בה
    if (rootFrameworks.length === 1) {
      return buildTree(rootFrameworks[0]);
    }

    // אם יש כמה מסגרות שורש, צור מסגרת על
    return {
      name: 'מבנה פלוגה',
      level: 'ROOT',
      children: rootFrameworks.map(framework => buildTree(framework))
    };
  }, [frameworks, soldiers]);

  // קביעת רמת המסגרת לפי השם
  const getFrameworkLevel = (frameworkName: string): string => {
    const name = frameworkName.toLowerCase();
    if (name.includes('פלוגה') || name.includes('מפקדה')) return 'COMPANY';
    if (name.includes('פלגה')) return 'PLATOON';
    if (name.includes('צוות')) return 'TEAM';
    if (name.includes('כיתה')) return 'SQUAD';
    return 'OTHER';
  };

  // קביעת צבע לפי רמה
  const getLevelColor = (level: string): string => {
    switch (level) {
      case 'ROOT': return '#1f2937'; // Dark gray
      case 'COMPANY': return '#dc2626'; // Red
      case 'PLATOON': return '#2563eb'; // Blue
      case 'TEAM': return '#059669'; // Green
      case 'SQUAD': return '#d97706'; // Orange
      default: return '#9ca3af';
    }
  };

  // קביעת גודל לפי רמה ורספונסיביות - מותאם לתצוגה החדשה
  const getNodeSize = (level: string, soldierCount: number = 0): { width: number; height: number } => {
    let baseWidth, baseHeight;
    
    if (isSmallMobile) {
      // מסך קטן מאוד
      baseWidth = level === 'ROOT' ? 220 : level === 'COMPANY' ? 200 : level === 'PLATOON' ? 180 : 160;
      baseHeight = level === 'ROOT' ? 140 : level === 'COMPANY' ? 130 : level === 'PLATOON' ? 120 : 110;
    } else if (isMobile) {
      // מסך בינוני
      baseWidth = level === 'ROOT' ? 260 : level === 'COMPANY' ? 240 : level === 'PLATOON' ? 220 : 200;
      baseHeight = level === 'ROOT' ? 160 : level === 'COMPANY' ? 150 : level === 'PLATOON' ? 140 : 130;
    } else {
      // מסך גדול
      baseWidth = level === 'ROOT' ? 300 : level === 'COMPANY' ? 280 : level === 'PLATOON' ? 260 : 240;
      baseHeight = level === 'ROOT' ? 180 : level === 'COMPANY' ? 170 : level === 'PLATOON' ? 160 : 150;
    }
    
    // הגדלת הגובה אם יש חיילים - מותאם לתצוגה החדשה עם לבנות נפרדות
    if (soldierCount > 0) {
      const maxVisibleSoldiers = isSmallMobile ? 4 : isMobile ? 6 : 8;
      const soldierHeight = isSmallMobile ? 12 : isMobile ? 14 : 16;
      const boxPadding = 20;
      const boxSpacing = 10;
      
      // חישוב גובה נדרש לשני הלבנות
      const staffCount = Math.min(Math.ceil(soldierCount / 2), Math.floor(maxVisibleSoldiers / 2));
      const regularCount = Math.min(Math.floor(soldierCount / 2), Math.floor(maxVisibleSoldiers / 2));
      
      const staffBoxHeight = staffCount * soldierHeight + boxPadding;
      const regularBoxHeight = regularCount * soldierHeight + boxPadding;
      
      const totalExtraHeight = staffBoxHeight + regularBoxHeight + boxSpacing + 40; // 40 למרווחים נוספים
      
      return { 
        width: baseWidth, 
        height: baseHeight + totalExtraHeight 
      };
    }
    
    return { 
      width: baseWidth, 
      height: baseHeight 
    };
  };

  useEffect(() => {
    const data = buildHierarchicalData();
    setChartData(data);
  }, [buildHierarchicalData]);

  useEffect(() => {
    if (!chartData || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // מרווחים מותאמים למסך
    const margin = isSmallMobile 
      ? { top: 30, right: 30, bottom: 30, left: 30 }
      : isMobile 
        ? { top: 40, right: 40, bottom: 40, left: 40 }
        : { top: 60, right: 60, bottom: 60, left: 60 };

    const containerWidth = svgRef.current.parentElement?.clientWidth || 1200;
    const width = containerWidth - margin.left - margin.right;
    
    // גובה דינמי בהתאם למספר הצמתים - גדול יותר
    const nodeCount = chartData.children?.length || 1;
    const baseHeight = isSmallMobile ? 800 : isMobile ? 1000 : 1200;
    const height = Math.max(baseHeight, nodeCount * (isSmallMobile ? 250 : isMobile ? 300 : 350));

    svg.attr("width", containerWidth).attr("height", height);

    const root = d3.hierarchy(chartData);
    
    // התאמת מרווחים בין צמתים - גדול יותר
    const nodeSeparation = isSmallMobile ? 1.0 : isMobile ? 1.2 : 1.5;
    const treeLayout = d3.tree<ChartNode>()
      .size([width, height - 150])
      .nodeSize([isSmallMobile ? 150 : isMobile ? 180 : 200, isSmallMobile ? 250 : isMobile ? 300 : 350])
      .separation((a, b) => {
        // מניעת חפיפה בין צמתים
        const aSize = getNodeSize(a.data.level, a.data.soldiersInFramework?.length || 0);
        const bSize = getNodeSize(b.data.level, b.data.soldiersInFramework?.length || 0);
        const minSeparation = (aSize.width + bSize.width) / 2 + 50;
        return Math.max(nodeSeparation, minSeparation / 100);
      });
    
    treeLayout(root);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // קווים מחברים - רק בין מסגרות
    g.selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("d", d3.linkVertical<any, any>()
        .x((d: any) => d.x)
        .y((d: any) => d.y))
      .style("fill", "none")
      .style("stroke", "#9ca3af")
      .style("stroke-width", isSmallMobile ? 2 : 3)
      .style("stroke-dasharray", "5,5");

    // צמתים
    const nodes = g.selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.x}, ${d.y})`);

    // מלבנים לצמתים
    nodes.append("rect")
      .attr("width", d => getNodeSize(d.data.level, d.data.soldiersInFramework?.length || 0).width)
      .attr("height", d => getNodeSize(d.data.level, d.data.soldiersInFramework?.length || 0).height)
      .attr("x", d => -getNodeSize(d.data.level, d.data.soldiersInFramework?.length || 0).width / 2)
      .attr("y", d => -getNodeSize(d.data.level, d.data.soldiersInFramework?.length || 0).height / 2)
      .attr("rx", isSmallMobile ? 8 : 12)
      .style("fill", d => getLevelColor(d.data.level))
      .style("stroke", "#374151")
      .style("stroke-width", isSmallMobile ? 2 : 3)
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        d3.select(this)
          .style("stroke-width", isSmallMobile ? 4 : 5)
          .style("stroke", "#1f2937");
      })
      .on("mouseout", function(event, d) {
        d3.select(this)
          .style("stroke-width", isSmallMobile ? 2 : 3)
          .style("stroke", "#374151");
      })
      .on("click", function(event, d) {
        // ניווט לעמוד המסגרת אם יש frameworkId
        if (d.data.frameworkId && d.data.frameworkId !== 'ROOT') {
          navigate(`/frameworks/${d.data.frameworkId}`);
        }
      });

    // טקסט בצמתים - שם המסגרת
    nodes.append("text")
      .style("text-anchor", "middle")
      .style("font-family", "Arial, sans-serif")
      .style("font-size", d => {
        const level = d.data.level;
        if (isSmallMobile) {
          if (level === 'ROOT') return "14px";
          if (level === 'COMPANY') return "13px";
          if (level === 'PLATOON') return "12px";
          return "11px";
        } else if (isMobile) {
          if (level === 'ROOT') return "16px";
          if (level === 'COMPANY') return "15px";
          if (level === 'PLATOON') return "14px";
          return "13px";
        } else {
          if (level === 'ROOT') return "18px";
          if (level === 'COMPANY') return "17px";
          if (level === 'PLATOON') return "16px";
          return "15px";
        }
      })
      .style("font-weight", "bold")
      .style("fill", "white")
      .attr("y", d => {
        const nodeHeight = getNodeSize(d.data.level, d.data.soldiersInFramework?.length || 0).height;
        return -nodeHeight / 2 + (isSmallMobile ? 20 : isMobile ? 24 : 28);
      })
      .text(d => d.data.name); // הצגת השם המלא

    // טקסט מפקד - אם יש
    nodes.filter(d => d.data.commander !== undefined)
      .append("text")
      .style("text-anchor", "middle")
      .style("font-family", "Arial, sans-serif")
      .style("font-size", isSmallMobile ? "10px" : isMobile ? "12px" : "14px")
      .style("fill", "#fbbf24")
      .style("font-weight", "bold")
      .attr("y", d => {
        const nodeHeight = getNodeSize(d.data.level, d.data.soldiersInFramework?.length || 0).height;
        return -nodeHeight / 2 + (isSmallMobile ? 40 : isMobile ? 48 : 56);
      })
      .text(d => `מפקד: ${d.data.commander?.name}`);

    // אזור חיילים - אם יש חיילים במסגרת
    nodes.filter(d => d.data.soldiersInFramework !== undefined && d.data.soldiersInFramework.length > 0)
      .each(function(d) {
        const node = d3.select(this);
        const nodeHeight = getNodeSize(d.data.level, d.data.soldiersInFramework?.length || 0).height;
        const nodeWidth = getNodeSize(d.data.level, d.data.soldiersInFramework?.length || 0).width;
        
        // חלוקת החיילים לסגל וחיילים רגילים
        const allSoldiers = d.data.soldiersInFramework || [];
        const staffSoldiers = allSoldiers.filter(s => 
          s.role.includes('מפקד') || 
          s.role.includes('סמל') || 
          s.role.includes('רספ')
        );
        const regularSoldiers = allSoldiers.filter(s => 
          !s.role.includes('מפקד') && 
          !s.role.includes('סמל') &&
          !s.role.includes('רספ')
        );

        // מלבן לאזור החיילים - רקע כללי
        node.append("rect")
          .attr("width", nodeWidth - (isSmallMobile ? 16 : 20))
          .attr("height", nodeHeight - (isSmallMobile ? 60 : 70))
          .attr("x", -(nodeWidth - (isSmallMobile ? 16 : 20)) / 2)
          .attr("y", -nodeHeight / 2 + (isSmallMobile ? 60 : 70))
          .attr("rx", isSmallMobile ? 6 : 8)
          .style("fill", "rgba(255, 255, 255, 0.05)")
          .style("stroke", "rgba(255, 255, 255, 0.2)")
          .style("stroke-width", 1);

        // טקסט מספר החיילים
        node.append("text")
          .style("text-anchor", "middle")
          .style("font-family", "Arial, sans-serif")
          .style("font-size", isSmallMobile ? "10px" : isMobile ? "12px" : "14px")
          .style("fill", "rgba(255, 255, 255, 0.9)")
          .style("font-weight", "bold")
          .attr("y", -nodeHeight / 2 + (isSmallMobile ? 80 : 95))
          .text(`${allSoldiers.length} חיילים`);

        const soldierHeight = isSmallMobile ? 12 : isMobile ? 14 : 16;
        const maxVisibleSoldiers = isSmallMobile ? 4 : isMobile ? 6 : 8;
        let currentY = -nodeHeight / 2 + (isSmallMobile ? 100 : 120);

        // אזור סגל - לבנה נפרדת
        if (staffSoldiers.length > 0) {
          const staffBoxHeight = Math.min(staffSoldiers.length, maxVisibleSoldiers / 2) * soldierHeight + 20;
          
          // רקע לאזור הסגל
          node.append("rect")
            .attr("width", nodeWidth - (isSmallMobile ? 24 : 28))
            .attr("height", staffBoxHeight)
            .attr("x", -(nodeWidth - (isSmallMobile ? 24 : 28)) / 2)
            .attr("y", currentY - 10)
            .attr("rx", isSmallMobile ? 4 : 6)
            .style("fill", "rgba(251, 191, 36, 0.15)")
            .style("stroke", "rgba(251, 191, 36, 0.4)")
            .style("stroke-width", 1);

          // כותרת סגל
          node.append("text")
            .style("text-anchor", "middle")
            .style("font-family", "Arial, sans-serif")
            .style("font-size", isSmallMobile ? "9px" : isMobile ? "11px" : "13px")
            .style("fill", "#fbbf24")
            .style("font-weight", "bold")
            .attr("y", currentY)
            .text("סגל");

          // רשימת הסגל
          staffSoldiers.slice(0, Math.floor(maxVisibleSoldiers / 2)).forEach((soldier, index) => {
            const yOffset = currentY + 15 + (index * soldierHeight);
            
            node.append("text")
              .style("text-anchor", "middle")
              .style("font-family", "Arial, sans-serif")
              .style("font-size", isSmallMobile ? "8px" : isMobile ? "10px" : "12px")
              .style("fill", "#fbbf24")
              .style("font-weight", "500")
              .attr("y", yOffset)
              .text(`${soldier.name} (${soldier.personalNumber})`);
          });

          currentY += staffBoxHeight + 10;
        }

        // אזור חיילים רגילים - לבנה נפרדת
        if (regularSoldiers.length > 0) {
          const regularBoxHeight = Math.min(regularSoldiers.length, maxVisibleSoldiers / 2) * soldierHeight + 20;
          
          // רקע לאזור החיילים הרגילים
          node.append("rect")
            .attr("width", nodeWidth - (isSmallMobile ? 24 : 28))
            .attr("height", regularBoxHeight)
            .attr("x", -(nodeWidth - (isSmallMobile ? 24 : 28)) / 2)
            .attr("y", currentY - 10)
            .attr("rx", isSmallMobile ? 4 : 6)
            .style("fill", "rgba(255, 255, 255, 0.1)")
            .style("stroke", "rgba(255, 255, 255, 0.3)")
            .style("stroke-width", 1);

          // כותרת חיילים רגילים
          node.append("text")
            .style("text-anchor", "middle")
            .style("font-family", "Arial, sans-serif")
            .style("font-size", isSmallMobile ? "9px" : isMobile ? "11px" : "13px")
            .style("fill", "rgba(255, 255, 255, 0.9)")
            .style("font-weight", "bold")
            .attr("y", currentY)
            .text("חיילים");

          // רשימת החיילים הרגילים
          regularSoldiers.slice(0, Math.floor(maxVisibleSoldiers / 2)).forEach((soldier, index) => {
            const yOffset = currentY + 15 + (index * soldierHeight);
            
            node.append("text")
              .style("text-anchor", "middle")
              .style("font-family", "Arial, sans-serif")
              .style("font-size", isSmallMobile ? "8px" : isMobile ? "10px" : "12px")
              .style("fill", "rgba(255, 255, 255, 0.8)")
              .attr("y", yOffset)
              .text(`${soldier.name} (${soldier.personalNumber})`);
          });

          currentY += regularBoxHeight + 10;
        }

        // אינדיקציה אם יש יותר חיילים ממה שנראה
        const totalVisible = Math.min(staffSoldiers.length, Math.floor(maxVisibleSoldiers / 2)) + 
                           Math.min(regularSoldiers.length, Math.floor(maxVisibleSoldiers / 2));
        
        if (allSoldiers.length > totalVisible) {
          node.append("text")
            .style("text-anchor", "middle")
            .style("font-family", "Arial, sans-serif")
            .style("font-size", isSmallMobile ? "7px" : isMobile ? "9px" : "11px")
            .style("fill", "rgba(255, 255, 255, 0.6)")
            .style("font-style", "italic")
            .attr("y", currentY)
            .text(`+${allSoldiers.length - totalVisible} נוספים`);
        }
      });

    // זום וניווט - מותאם למסכים קטנים
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, isSmallMobile ? 3 : 4])
      .on("zoom", (event) => {
        g.attr("transform", `translate(${margin.left}, ${margin.top}) ${event.transform}`);
      });

    svg.call(zoom as any);

  }, [chartData, isMobile, isSmallMobile, navigate]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!chartData) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        לא נמצאו נתונים להצגה. יש להוסיף מסגרות וחיילים תחילה.
      </Alert>
    );
  }

  return (
    <Box sx={{ width: '100%', direction: 'rtl' }}>
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          תרשים ארגוני - מבנה פלוגה
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          {soldiers.length} חיילים ב-{frameworks.length} מסגרות
        </Typography>
        
        {/* מקרא - מותאם למסכים קטנים */}
        <Box sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: isSmallMobile ? 1 : 2, 
          justifyContent: 'center',
          mb: 2 
        }}>
          {[
            { level: 'COMPANY', label: 'פלוגה/מפקדה', color: '#dc2626' },
            { level: 'PLATOON', label: 'פלגה', color: '#2563eb' },
            { level: 'TEAM', label: 'צוות', color: '#059669' },
            { level: 'SQUAD', label: 'כיתה', color: '#d97706' }
          ].map(({ level, label, color }) => (
            <Box key={level} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ 
                width: isSmallMobile ? 10 : 14, 
                height: isSmallMobile ? 10 : 14, 
                bgcolor: color, 
                borderRadius: 1,
                border: '1px solid #374151'
              }} />
              <Typography variant={isSmallMobile ? "caption" : "caption"}>{label}</Typography>
            </Box>
          ))}
        </Box>
        
        {/* מקרא לחלוקת חיילים */}
        <Box sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: isSmallMobile ? 1 : 2, 
          justifyContent: 'center',
          mb: 2 
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ 
              width: isSmallMobile ? 10 : 14, 
              height: isSmallMobile ? 10 : 14, 
              bgcolor: '#fbbf24', 
              borderRadius: 1,
              border: '1px solid #374151'
            }} />
            <Typography variant={isSmallMobile ? "caption" : "caption"}>סגל (מפקדים)</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ 
              width: isSmallMobile ? 10 : 14, 
              height: isSmallMobile ? 10 : 14, 
              bgcolor: 'rgba(255, 255, 255, 0.7)', 
              borderRadius: 1,
              border: '1px solid #374151'
            }} />
            <Typography variant={isSmallMobile ? "caption" : "caption"}>חיילים רגילים</Typography>
          </Box>
        </Box>
      </Box>
      
      <Box sx={{ 
        overflow: 'auto', 
        border: '1px solid #e5e7eb', 
        borderRadius: 2,
        bgcolor: 'white',
        maxHeight: isSmallMobile ? '75vh' : isMobile ? '85vh' : '90vh'
      }}>
        <svg ref={svgRef} style={{ width: '100%', height: 'auto' }} />
      </Box>
      
      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          💡 {isSmallMobile ? 'גרור לניווט, צביטה לזום • לחץ על קוביה לניווט למסגרת • סגל וחיילים מוצגים בלבנות נפרדות' : 'השתמש בגלגל העכבר לזום, גרור כדי להזיז את התרשים • לחץ על קוביה לניווט למסגרת • סגל וחיילים מוצגים בלבנות נפרדות'}
        </Typography>
      </Box>
    </Box>
  );
};

export default HierarchicalChart; 