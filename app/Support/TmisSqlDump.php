<?php

namespace App\Support;

use InvalidArgumentException;

class TmisSqlDump
{
    /** @return array<string, list<array<string, int|string|null>>> */
    public function parse(string $sql): array
    {
        $tables = array_fill_keys(['region', 'organization', 'user_roles', 'users', 'user_auth'], []);
        preg_match_all("/INSERT INTO `([a-z_]+)`\\s*\\(([^)]+)\\)\\s*VALUES\\s*((?:'(?:(?:\\\\.)|''|[^'\\\\])*'|[^';])+);/s", $sql, $statements, PREG_SET_ORDER);
        foreach ($statements as $statement) {
            $table = $statement[1];
            if (! array_key_exists($table, $tables)) {
                throw new InvalidArgumentException('Unsupported import table: '.$table);
            }
            preg_match_all('/`([a-z_]+)`/', $statement[2], $columns);
            $offset = 0;
            $values = $statement[3];
            while ($offset < strlen($values)) {
                if (! preg_match('/\G\s*(?:,\s*)?\(/', $values, $start, 0, $offset)) {
                    if (trim(substr($values, $offset)) === '') {
                        break;
                    }
                    throw new InvalidArgumentException('Malformed SQL row in '.$table);
                }
                $offset += strlen($start[0]);
                $row = [];
                foreach ($columns[1] as $index => $column) {
                    if (! preg_match("/\\G\\s*(NULL|-?[0-9]+|'(?:(?:\\\\.)|''|[^'\\\\])*')\\s*([,)])/s", $values, $token, 0, $offset)) {
                        throw new InvalidArgumentException('Only literal SQL values are supported in '.$table);
                    }
                    $offset += strlen($token[0]);
                    if ($token[2] !== ($index === count($columns[1]) - 1 ? ')' : ',')) {
                        throw new InvalidArgumentException('SQL column count mismatch in '.$table);
                    }
                    $value = $token[1];
                    $row[$column] = match (true) {
                        $value === 'NULL' => null,
                        $value[0] !== "'" => (int) $value,
                        default => strtr(substr($value, 1, -1), ["''" => "'", "\\'" => "'", '\\\\' => '\\', '\n' => "\n", '\r' => "\r", '\t' => "\t", '\0' => "\0"]),
                    };
                }
                $tables[$table][] = $row;
            }
        }
        foreach ($tables as $table => $rows) {
            if ($rows === []) {
                throw new InvalidArgumentException('Missing INSERT records for '.$table);
            }
        }

        return $tables;
    }
}
