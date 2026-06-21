# queryDb.ps1
# Called by Node.js to query the Access DB via OleDb and return JSON
# Usage: powershell -File queryDb.ps1 -DbPath "..." -Sql "SELECT ..."

# Force UTF-8 output so Arabic / non-Latin names come through correctly
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

param(
    [string]$DbPath,
    [string]$Sql
)

try {
    Add-Type -AssemblyName System.Data

    $conn = New-Object System.Data.OleDb.OleDbConnection
    $conn.ConnectionString = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$DbPath;Persist Security Info=False;"
    $conn.Open()

    $cmd = $conn.CreateCommand()
    $cmd.CommandText = $Sql

    $reader = $cmd.ExecuteReader()

    $results = @()
    while ($reader.Read()) {
        $row = [ordered]@{}
        for ($i = 0; $i -lt $reader.FieldCount; $i++) {
            $name = $reader.GetName($i)
            $val  = $reader.GetValue($i)
            # Convert DBNull to null, DateTime to ISO string
            if ($val -is [System.DBNull]) {
                $row[$name] = $null
            } elseif ($val -is [System.DateTime]) {
                $row[$name] = $val.ToString("yyyy-MM-ddTHH:mm:ss")
            } else {
                $row[$name] = $val
            }
        }
        $results += $row
    }

    $reader.Close()
    $conn.Close()

    $results | ConvertTo-Json -Depth 5 -Compress
} catch {
    # Output error as JSON so Node can detect it
    @{ __error = $_.ToString() } | ConvertTo-Json -Compress
    exit 1
}
