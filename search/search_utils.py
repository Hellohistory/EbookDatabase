from typing import Tuple, Dict, List, Optional


def build_search_query(query: str, field: str, fuzzy: Optional[bool], page_size: int, page: int) \
        -> Tuple[str, str, Dict]:
    """
    构建基础搜索查询字符串和参数。
    """
    query_field_dict = {
        "title": "title",
        "author": "author",
        "publisher": "publisher",
        "publishdate": "publishdate",
        "isbn": "ISBN",
        "sscode": "SS_code",
        "dxid": "dxid"
    }

    params = {}
    conditions_str = ""

    if field in query_field_dict:
        conditions_str = f" WHERE {query_field_dict[field]} LIKE :{field}" if fuzzy \
            else f" WHERE {query_field_dict[field]} = :{field}"
        params[field] = f"%{query}%" if fuzzy else query

    # 构建查询字符串
    query_str = f"SELECT * FROM books{conditions_str}"
    total_query_str = f"SELECT COUNT(*) FROM books{conditions_str}"

    # 添加分页信息
    offset = (page - 1) * page_size
    query_str += f" LIMIT {page_size} OFFSET {offset}"

    return query_str, total_query_str, params


def build_advanced_search_query(fields: List[str], queries: List[str], logics: List[str], fuzzies: List[Optional[bool]],
                                page_size: int, page: int) -> Tuple[str, str, Dict]:
    """
    构建高级搜索查询字符串和参数，包括逻辑运算符。
    """
    if len(fields) == 0:
        raise ValueError("字段列表不能为空。")

    if len(logics) != len(fields) - 1:
        raise ValueError("逻辑操作符的数量应该等于字段数量减一。")

    query_field_dict = {
        "title": "title",
        "author": "author",
        "publisher": "publisher",
        "publishdate": "publishdate",
        "isbn": "ISBN",
        "sscode": "SS_code",
        "dxid": "dxid"
    }

    params = {}
    query_conditions = []

    # 根据fields构建查询条件
    for i, field in enumerate(fields):
        if field not in query_field_dict:
            raise ValueError(f"未知的搜索字段: {field}")
        field_placeholder = f"{field}{i}"
        condition = f"{query_field_dict[field]} LIKE :{field_placeholder}" if fuzzies[
            i] else f"{query_field_dict[field]} = :{field_placeholder}"
        params[field_placeholder] = f"%{queries[i]}%" if fuzzies[i] else queries[i]
        query_conditions.append(condition)

    # 将条件和逻辑运算符合并
    combined_conditions = f" WHERE ({query_conditions[0]})"
    for i in range(1, len(query_conditions)):
        logic = logics[i - 1].upper()
        if logic not in ['AND', 'OR']:
            raise ValueError(f"无效的逻辑操作符：{logic}")
        combined_conditions += f" {logic} ({query_conditions[i]})"

    # 构建查询字符串
    query_str = f"SELECT * FROM books{combined_conditions}"
    total_query_str = f"SELECT COUNT(*) FROM books{combined_conditions}"

    # 添加分页信息
    offset = (page - 1) * page_size
    query_str += f" LIMIT {page_size} OFFSET {offset}"

    return query_str, total_query_str, params
