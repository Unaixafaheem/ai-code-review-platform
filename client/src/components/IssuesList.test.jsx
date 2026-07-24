import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import IssuesList from '../components/IssuesList';

describe('IssuesList', () => {
  it('renders scored issues', () => {
    render(
      <IssuesList
        issues={[
          { line: 3, severity: 'high', confidence: 90, message: 'Possible XSS', category: 'security' },
        ]}
      />
    );
    expect(screen.getByText(/Possible XSS/)).toBeInTheDocument();
    expect(screen.getByText(/90% conf/)).toBeInTheDocument();
  });

  it('renders nothing when empty', () => {
    const { container } = render(<IssuesList issues={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
