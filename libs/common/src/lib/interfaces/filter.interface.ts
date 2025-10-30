export interface Filter {
  id: string;
  label?: string;
  type:
    | 'ACCOUNT'
    | 'ASSET_CLASS'
    | 'ASSET_SUB_CLASS'
    | 'CASHFLOW_CATEGORY'
    | 'CASHFLOW_TYPE'
    | 'DATA_SOURCE'
    | 'HOLDING_TYPE'
    | 'PRESET_ID'
    | 'SEARCH_QUERY'
    | 'SYMBOL'
    | 'TAG';
}
