module.exports = {
  nodes: [
    {data: {id: '2020::A', rled_state: false, gled_state: false}},
    {data: {id: '2020::C', rled_state: false, gled_state: false}},
    {data: {id: '2020::B', rled_state: false, gled_state: false}},
    {data: {id: '2020::D', rled_state: false, gled_state: false}},
    {data: {id: '2020::E', rled_state: false, gled_state: false}},
    {data: {id: '2020::F', rled_state: false, gled_state: false}},
    {
      data: {id: '2020::10', rled_state: false, gled_state: false},
    },
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
