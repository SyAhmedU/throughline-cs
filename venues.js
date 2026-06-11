// Throughline CS — curated venue directory.
// No-fab: every entry is a real, long-running venue; `dblp` keys are verified
// against live dblp.org (see _venues.verify.mjs) and every link points at a
// real venue page. No acceptance rates or deadlines are hardcoded — they
// change yearly; the UI links out to live aggregators instead.
// type: 'conf' | 'journal'. dblp: path under https://dblp.org/db/.

export const AREAS = [
  'ML / AI', 'NLP', 'Vision', 'Data Mining / IR / Web', 'Systems',
  'Networking', 'Databases', 'Security', 'SE / PL', 'HCI', 'Theory',
  'Architecture', 'Robotics', 'General',
];

export const VENUES = [
  // ── ML / AI ──
  { id:'neurips', name:'NeurIPS — Neural Information Processing Systems', area:'ML / AI', type:'conf', org:'NeurIPS Foundation', dblp:'conf/nips', site:'https://neurips.cc' },
  { id:'icml',    name:'ICML — International Conference on Machine Learning', area:'ML / AI', type:'conf', org:'PMLR', dblp:'conf/icml', site:'https://icml.cc' },
  { id:'iclr',    name:'ICLR — International Conference on Learning Representations', area:'ML / AI', type:'conf', org:'ICLR', dblp:'conf/iclr', site:'https://iclr.cc' },
  { id:'aaai',    name:'AAAI Conference on Artificial Intelligence', area:'ML / AI', type:'conf', org:'AAAI', dblp:'conf/aaai' },
  { id:'ijcai',   name:'IJCAI — International Joint Conference on AI', area:'ML / AI', type:'conf', org:'IJCAI', dblp:'conf/ijcai' },
  { id:'aistats', name:'AISTATS — Artificial Intelligence and Statistics', area:'ML / AI', type:'conf', org:'PMLR', dblp:'conf/aistats' },
  { id:'jmlr',    name:'JMLR — Journal of Machine Learning Research', area:'ML / AI', type:'journal', org:'JMLR Inc.', dblp:'journals/jmlr', site:'https://jmlr.org' },
  { id:'pami',    name:'IEEE TPAMI — Transactions on Pattern Analysis and Machine Intelligence', area:'ML / AI', type:'journal', org:'IEEE', dblp:'journals/pami' },

  // ── NLP ──
  { id:'acl',    name:'ACL — Association for Computational Linguistics', area:'NLP', type:'conf', org:'ACL', dblp:'conf/acl', site:'https://aclanthology.org' },
  { id:'emnlp',  name:'EMNLP — Empirical Methods in NLP', area:'NLP', type:'conf', org:'ACL', dblp:'conf/emnlp' },
  { id:'naacl',  name:'NAACL — North American Chapter of the ACL', area:'NLP', type:'conf', org:'ACL', dblp:'conf/naacl' },
  { id:'tacl',   name:'TACL — Transactions of the ACL', area:'NLP', type:'journal', org:'ACL / MIT Press', dblp:'journals/tacl' },

  // ── Vision ──
  { id:'cvpr', name:'CVPR — Computer Vision and Pattern Recognition', area:'Vision', type:'conf', org:'IEEE / CVF', dblp:'conf/cvpr' },
  { id:'iccv', name:'ICCV — International Conference on Computer Vision', area:'Vision', type:'conf', org:'IEEE / CVF', dblp:'conf/iccv' },
  { id:'eccv', name:'ECCV — European Conference on Computer Vision', area:'Vision', type:'conf', org:'Springer', dblp:'conf/eccv' },

  // ── Data Mining / IR / Web ──
  { id:'kdd',   name:'KDD — Knowledge Discovery and Data Mining', area:'Data Mining / IR / Web', type:'conf', org:'ACM SIGKDD', dblp:'conf/kdd' },
  { id:'www',   name:'TheWebConf (WWW)', area:'Data Mining / IR / Web', type:'conf', org:'ACM / IW3C2', dblp:'conf/www' },
  { id:'sigir', name:'SIGIR — Research and Development in Information Retrieval', area:'Data Mining / IR / Web', type:'conf', org:'ACM SIGIR', dblp:'conf/sigir' },
  { id:'wsdm',  name:'WSDM — Web Search and Data Mining', area:'Data Mining / IR / Web', type:'conf', org:'ACM', dblp:'conf/wsdm' },
  { id:'cikm',  name:'CIKM — Information and Knowledge Management', area:'Data Mining / IR / Web', type:'conf', org:'ACM', dblp:'conf/cikm' },

  // ── Systems ──
  { id:'sosp',    name:'SOSP — Symposium on Operating Systems Principles', area:'Systems', type:'conf', org:'ACM SIGOPS', dblp:'conf/sosp' },
  { id:'osdi',    name:'OSDI — Operating Systems Design and Implementation', area:'Systems', type:'conf', org:'USENIX', dblp:'conf/osdi' },
  { id:'eurosys', name:'EuroSys — European Conference on Computer Systems', area:'Systems', type:'conf', org:'ACM SIGOPS', dblp:'conf/eurosys' },
  { id:'atc',     name:'USENIX ATC — Annual Technical Conference', area:'Systems', type:'conf', org:'USENIX', dblp:'conf/usenix' },

  // ── Networking ──
  { id:'sigcomm', name:'SIGCOMM — Data Communication', area:'Networking', type:'conf', org:'ACM SIGCOMM', dblp:'conf/sigcomm' },
  { id:'nsdi',    name:'NSDI — Networked Systems Design and Implementation', area:'Networking', type:'conf', org:'USENIX', dblp:'conf/nsdi' },
  { id:'imc',     name:'IMC — Internet Measurement Conference', area:'Networking', type:'conf', org:'ACM', dblp:'conf/imc' },

  // ── Databases ──
  { id:'sigmod', name:'SIGMOD — Management of Data', area:'Databases', type:'conf', org:'ACM SIGMOD', dblp:'conf/sigmod' },
  { id:'pvldb',  name:'PVLDB — Proceedings of the VLDB Endowment', area:'Databases', type:'journal', org:'VLDB Endowment', dblp:'journals/pvldb' },
  { id:'icde',   name:'ICDE — International Conference on Data Engineering', area:'Databases', type:'conf', org:'IEEE', dblp:'conf/icde' },

  // ── Security ──
  { id:'sp',   name:'IEEE S&P — Symposium on Security and Privacy ("Oakland")', area:'Security', type:'conf', org:'IEEE', dblp:'conf/sp' },
  { id:'ccs',  name:'CCS — Computer and Communications Security', area:'Security', type:'conf', org:'ACM SIGSAC', dblp:'conf/ccs' },
  { id:'uss',  name:'USENIX Security Symposium', area:'Security', type:'conf', org:'USENIX', dblp:'conf/uss' },
  { id:'ndss', name:'NDSS — Network and Distributed System Security', area:'Security', type:'conf', org:'Internet Society', dblp:'conf/ndss' },

  // ── SE / PL ──
  { id:'icse',   name:'ICSE — International Conference on Software Engineering', area:'SE / PL', type:'conf', org:'ACM / IEEE', dblp:'conf/icse' },
  { id:'fse',    name:'FSE — Foundations of Software Engineering', area:'SE / PL', type:'conf', org:'ACM SIGSOFT', dblp:'conf/sigsoft' },
  { id:'ase',    name:'ASE — Automated Software Engineering', area:'SE / PL', type:'conf', org:'ACM / IEEE', dblp:'conf/kbse' },
  { id:'pldi',   name:'PLDI — Programming Language Design and Implementation', area:'SE / PL', type:'conf', org:'ACM SIGPLAN', dblp:'conf/pldi' },
  { id:'popl',   name:'POPL — Principles of Programming Languages', area:'SE / PL', type:'conf', org:'ACM SIGPLAN', dblp:'conf/popl' },
  { id:'oopsla', name:'OOPSLA — Object-Oriented Programming, Systems, Languages & Applications', area:'SE / PL', type:'conf', org:'ACM SIGPLAN', dblp:'conf/oopsla' },
  { id:'tse',    name:'IEEE TSE — Transactions on Software Engineering', area:'SE / PL', type:'journal', org:'IEEE', dblp:'journals/tse' },
  { id:'tosem',  name:'ACM TOSEM — Transactions on Software Engineering and Methodology', area:'SE / PL', type:'journal', org:'ACM', dblp:'journals/tosem' },

  // ── HCI ──
  { id:'chi',  name:'CHI — Human Factors in Computing Systems', area:'HCI', type:'conf', org:'ACM SIGCHI', dblp:'conf/chi' },
  { id:'uist', name:'UIST — User Interface Software and Technology', area:'HCI', type:'conf', org:'ACM SIGCHI', dblp:'conf/uist' },
  { id:'cscw', name:'CSCW — Computer-Supported Cooperative Work', area:'HCI', type:'conf', org:'ACM SIGCHI', dblp:'conf/cscw' },

  // ── Theory ──
  { id:'stoc', name:'STOC — Symposium on Theory of Computing', area:'Theory', type:'conf', org:'ACM SIGACT', dblp:'conf/stoc' },
  { id:'focs', name:'FOCS — Foundations of Computer Science', area:'Theory', type:'conf', org:'IEEE', dblp:'conf/focs' },
  { id:'soda', name:'SODA — Symposium on Discrete Algorithms', area:'Theory', type:'conf', org:'ACM-SIAM', dblp:'conf/soda' },
  { id:'jacm', name:'JACM — Journal of the ACM', area:'Theory', type:'journal', org:'ACM', dblp:'journals/jacm' },

  // ── Architecture ──
  { id:'isca',   name:'ISCA — International Symposium on Computer Architecture', area:'Architecture', type:'conf', org:'ACM / IEEE', dblp:'conf/isca' },
  { id:'micro',  name:'MICRO — International Symposium on Microarchitecture', area:'Architecture', type:'conf', org:'ACM / IEEE', dblp:'conf/micro' },
  { id:'asplos', name:'ASPLOS — Architectural Support for Programming Languages and OS', area:'Architecture', type:'conf', org:'ACM', dblp:'conf/asplos' },

  // ── Robotics ──
  { id:'icra', name:'ICRA — International Conference on Robotics and Automation', area:'Robotics', type:'conf', org:'IEEE', dblp:'conf/icra' },
  { id:'iros', name:'IROS — Intelligent Robots and Systems', area:'Robotics', type:'conf', org:'IEEE/RSJ', dblp:'conf/iros' },
  { id:'corl', name:'CoRL — Conference on Robot Learning', area:'Robotics', type:'conf', org:'PMLR', dblp:'conf/corl' },

  // ── General ──
  { id:'cacm', name:'CACM — Communications of the ACM', area:'General', type:'journal', org:'ACM', dblp:'journals/cacm' },
];

// Live deadline aggregators (linked out, never hardcoded):
export const DEADLINE_LINKS = [
  { name: 'ccfddl — CCF conference deadlines', url: 'https://ccfddl.com' },
  { name: 'aideadlin.es — AI conference deadlines', url: 'https://aideadlin.es' },
];

export const dblpUrl = (v) => `https://dblp.org/db/${v.dblp}/`;
