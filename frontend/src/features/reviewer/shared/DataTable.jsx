function DataTable({ columns, rows, empty = 'Không có dữ liệu phù hợp.' }) {
  return rows.length ? (
    <div className="reviewer-table-wrap">
      <table className="reviewer-table">
        <thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id ?? row.point ?? index}>
              {columns.map((column) => (
                <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : <div className="reviewer-empty">{empty}</div>;
}

export default DataTable;
