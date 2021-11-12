module.exports = {
  nodes: [
    { data: { id: '2020::A' } },
    { data: { id: '2020::C' } },
    { data: { id: '2020::B' } },
    { data: { id: '2020::D' } },
    { data: { id: '2020::E' } },
    { data: { id: '2020::F' } },
    { data: { id: '2020::10' } },
  ],
  edges: [
    {
      data: {
        source: '2020::A',
        target: '2020::C',
        id: '2020::A->2020::C',
      },
    },
    {
      data: {
        source: '2020::A',
        target: '2020::B',
        id: '2020::A->2020::B',
      },
    },
    {
      data: {
        source: '2020::B',
        target: '2020::D',
        id: '2020::B->2020::D',
      },
    },
    {
      data: {
        source: '2020::B',
        target: '2020::E',
        id: '2020::B->2020::E',
      },
    },
    {
      data: {
        source: '2020::E',
        target: '2020::F',
        id: '2020::E->2020::F',
      },
    },
    {
      data: {
        source: '2020::E',
        target: '2020::10',
        id: '2020::E->2020::10',
      },
    },
  ],
};
