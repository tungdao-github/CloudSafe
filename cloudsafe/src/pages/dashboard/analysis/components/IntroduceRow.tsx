import { InfoCircleOutlined } from '@ant-design/icons';
import { Area, Column } from '@ant-design/plots';
import { Col, Progress, Row, Tooltip } from 'antd';
import { formatNumber } from '@/utils/format';
import type { DataItem } from '../data.d';
import useStyles from '../style.style';
import ChartCard from './Charts/ChartCard';
import Field from './Charts/Field';
import Trend from './Trend';

const topColResponsiveProps = {
  xs: 24,
  sm: 12,
  md: 12,
  lg: 12,
  xl: 6,
  style: {
    marginBottom: 24,
  },
};
const IntroduceRow = ({
  loading,
  visitData,
}: {
  loading: boolean;
  visitData: DataItem[];
}) => {
  const { styles } = useStyles();
  return (
    <Row gutter={24}>
      <Col {...topColResponsiveProps}>
        <ChartCard
          variant="borderless"
          title="File đã mã hóa"
          action={
            <Tooltip title="Tổng số file được mã hóa và lưu trữ">
              <InfoCircleOutlined />
            </Tooltip>
          }
          loading={loading}
          total={() => <span>{formatNumber(1265)}</span>}
          footer={<Field label="Hôm nay" value={`+${formatNumber(42)} file`} />}
          contentHeight={46}
        >
          <Trend flag="up" style={{ marginRight: 16 }}>
            Tuần này
            <span className={styles.trendText}>12%</span>
          </Trend>
          <Trend flag="up">
            Tháng này
            <span className={styles.trendText}>8%</span>
          </Trend>
        </ChartCard>
      </Col>

      <Col {...topColResponsiveProps}>
        <ChartCard
          variant="borderless"
          loading={loading}
          title="Lượt truy cập"
          action={
            <Tooltip title="Số lượt tải lên/tải về trong ngày">
              <InfoCircleOutlined />
            </Tooltip>
          }
          total={formatNumber(8846)}
          footer={<Field label="Hôm nay" value={formatNumber(1234)} />}
          contentHeight={46}
        >
          <Area
            xField="x"
            yField="y"
            shapeField="smooth"
            height={46}
            axis={false}
            style={{
              fill: 'linear-gradient(-90deg, white 0%, #975FE4 100%)',
              fillOpacity: 0.6,
              width: '100%',
            }}
            padding={-20}
            data={visitData}
          />
        </ChartCard>
      </Col>

      <Col {...topColResponsiveProps}>
        <ChartCard
          variant="borderless"
          loading={loading}
          title="Hoạt động mã hóa"
          action={
            <Tooltip title="Số thao tác mã hóa/giải mã">
              <InfoCircleOutlined />
            </Tooltip>
          }
          total={formatNumber(6560)}
          footer={<Field label="Tỉ lệ thành công" value="99.8%" />}
          contentHeight={46}
        >
          <Column
            xField="x"
            yField="y"
            padding={-20}
            axis={false}
            height={46}
            data={visitData}
            scale={{ x: { paddingInner: 0.4 } }}
          />
        </ChartCard>
      </Col>

      <Col {...topColResponsiveProps}>
        <ChartCard
          loading={loading}
          variant="borderless"
          title="Bảo mật hệ thống"
          action={
            <Tooltip title="Mức độ bảo mật tổng thể">
              <InfoCircleOutlined />
            </Tooltip>
          }
          total="98%"
          footer={
            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
              <Trend flag="up" style={{ marginRight: 16 }}>
                Tuần này
                <span className={styles.trendText}>2%</span>
              </Trend>
              <Trend flag="up">
                Tháng này
                <span className={styles.trendText}>5%</span>
              </Trend>
            </div>
          }
          contentHeight={46}
        >
          <Progress
            percent={98}
            strokeColor={{ from: '#108ee9', to: '#52c41a' }}
            status="active"
          />
        </ChartCard>
      </Col>
    </Row>
  );
};
export default IntroduceRow;
