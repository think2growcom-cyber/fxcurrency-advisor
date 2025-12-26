
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface GaugeProps {
  value: number;
  label: string;
}

const Gauge: React.FC<GaugeProps> = ({ value, label }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 240;
    const height = 140;
    const radius = Math.min(width, height * 2) / 2 - 10;
    const innerRadius = radius - 25;

    const g = svg.append("g")
      .attr("transform", `translate(${width / 2}, ${height - 10})`);

    const arc = d3.arc()
      .innerRadius(innerRadius)
      .outerRadius(radius)
      .startAngle(-Math.PI / 2)
      .cornerRadius(4);

    // Background arc
    g.append("path")
      .datum({ endAngle: Math.PI / 2 })
      .style("fill", "#18181b")
      .attr("d", arc as any);

    // Color gradient scale
    const colorScale = d3.scaleLinear<string>()
      .domain([0, 50, 100])
      .range(["#f43f5e", "#f59e0b", "#10b981"]);

    const valueAngle = (value / 100) * Math.PI - Math.PI / 2;

    // Value arc with animation
    const path = g.append("path")
      .datum({ endAngle: -Math.PI / 2 })
      .style("fill", colorScale(value))
      .attr("d", arc as any);

    path.transition()
      .duration(1500)
      .attrTween("d", function(d: any) {
        const interpolate = d3.interpolate(d.endAngle, valueAngle);
        return function(t: number) {
          d.endAngle = interpolate(t);
          return arc(d) as string;
        };
      });

    // Score Text
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "-45")
      .attr("class", "text-3xl font-black fill-white font-mono")
      .text(`${Math.round(value)}%`);

    // Label Text
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "-20")
      .attr("class", "text-[9px] uppercase fill-zinc-500 font-black tracking-[0.3em]")
      .text(label);

  }, [value, label]);

  return (
    <div className="flex flex-col items-center justify-center p-2">
      <svg ref={svgRef} width="240" height="140" viewBox="0 0 240 140" />
    </div>
  );
};

export default Gauge;
