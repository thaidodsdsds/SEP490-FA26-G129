function DataTable({ columns, rows, emptyText = 'Chưa có dữ liệu' }) {
  return (
    <div className="dash-table-block">
      <p className="dash-scroll-hint">Vuốt ngang để xem thêm →</p>
      <div className="dash-table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key || column.label} scope="col">{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <div className="dash-empty">{emptyText}</div>
                </td>
              </tr>
            ) : rows.map((cells, rowIndex) => (
              <tr key={rowIndex}>
                {cells.map((cell, cellIndex) => (
                  <td key={cellIndex}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DataTable;
