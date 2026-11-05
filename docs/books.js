// Add each future book dataset here after loading its vocabulary script.
// The original book keeps its existing word/unit IDs for progress compatibility.
window.CIJIAN_BOOKS=[{
 id:'ielts-3800',displayOrder:3,title:'雅思标准词汇 · 3800',shortTitle:'雅思词汇 3800',
 author:'刘薇',edition:'第 2 版',category:'雅思',coverLabel:'IELTS',coverTitle:'雅思\n标准词汇',
 description:'按原书 Day 学习单词，再按字母分组积累词组。',
 sourcesBase:'sources',preserveIds:true,data:window.VOCABULARY
}, {
 id:'cet6',displayOrder:1,title:'六级词汇',shortTitle:'六级词汇',edition:'考试标签整理版',category:'英语六级',coverLabel:'CET-6',coverTitle:'大学英语\n六级词汇',
 description:'依据 ECDICT 六级标签整理，按词频每 100 词分组。词数按实际收录统计。',grouping:'个单词单元 · 按词频分组',
 sourceNote:'来源：ECDICT 的 cet6 标签（MIT 许可）。此整理版不等同于官方全量大纲。',data:window.CIJIAN_EXAM_BOOKS.cet6
}, {
 id:'postgraduate',displayOrder:2,title:'考研词汇',shortTitle:'考研词汇',edition:'考试标签整理版',category:'考研英语',coverLabel:'POSTGRAD',coverTitle:'考研英语\n核心词汇',
 description:'依据 ECDICT 考研标签整理，按词频每 100 词分组。重复词沿用已有学习记录。',grouping:'个单词单元 · 按词频分组',
 sourceNote:'来源：ECDICT 的 ky 标签（MIT 许可）。此整理版不等同于官方全量大纲。',data:window.CIJIAN_EXAM_BOOKS.ky
}];
