import {
  extractValidJson,
  processJsonLine,
  tryFixAndParseMultipleJsons
} from '../stream-processing';

describe('extractValidJson', () => {
  it('should extract valid JSON from a string', () => {
    const input = '{"name": "test"}';
    expect(extractValidJson(input)).toBe(input);
  });

  it('should handle nested objects', () => {
    const input = '{"data": {"nested": "value"}}';
    expect(extractValidJson(input)).toBe(input);
  });

  it('should handle strings with escaped quotes', () => {
    const input = '{"text": "some \\"quoted\\" text"}';
    expect(extractValidJson(input)).toBe(input);
  });

  it('should return null for invalid JSON', () => {
    expect(extractValidJson('{"invalid": "')).toBeNull();
  });

  it('should extract first complete JSON object from a string with trailing content', () => {
    const input = '{"valid": true} some extra content';
    expect(extractValidJson(input)).toBe('{"valid": true}');
  });
});

describe('processJsonLine', () => {
  const mockCallbacks = {
    onFile: jest.fn(),
    onError: jest.fn(),
    onComplete: jest.fn(),
    onBranch: jest.fn(),
    onStatus: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should process file items', () => {
    const fileItem = {
      type: 'file',
      path: 'test.txt',
      size: 100
    };
    
    processJsonLine(
      JSON.stringify(fileItem),
      mockCallbacks.onFile,
      mockCallbacks.onError,
      mockCallbacks.onComplete,
      mockCallbacks.onBranch,
      mockCallbacks.onStatus
    );

    expect(mockCallbacks.onFile).toHaveBeenCalledWith(fileItem);
  });

  it('should handle error items', () => {
    const errorItem = {
      type: 'error',
      message: 'Test error'
    };
    
    processJsonLine(
      JSON.stringify(errorItem),
      mockCallbacks.onFile,
      mockCallbacks.onError,
      mockCallbacks.onComplete,
      mockCallbacks.onBranch,
      mockCallbacks.onStatus
    );

    expect(mockCallbacks.onError).toHaveBeenCalledWith('Test error');
  });

  it('should handle complete items', () => {
    const completeItem = {
      type: 'complete',
      total_files: 10
    };
    
    processJsonLine(
      JSON.stringify(completeItem),
      mockCallbacks.onFile,
      mockCallbacks.onError,
      mockCallbacks.onComplete,
      mockCallbacks.onBranch,
      mockCallbacks.onStatus
    );

    expect(mockCallbacks.onComplete).toHaveBeenCalledWith(10);
  });

  it('should handle branch items', () => {
    const branchItem = {
      type: 'branch',
      name: 'main'
    };
    
    processJsonLine(
      JSON.stringify(branchItem),
      mockCallbacks.onFile,
      mockCallbacks.onError,
      mockCallbacks.onComplete,
      mockCallbacks.onBranch,
      mockCallbacks.onStatus
    );

    expect(mockCallbacks.onBranch).toHaveBeenCalledWith('main');
  });

  it('should handle status items', () => {
    const statusItem = {
      type: 'status',
      message: 'Processing files',
      files_processed: 5
    };
    
    processJsonLine(
      JSON.stringify(statusItem),
      mockCallbacks.onFile,
      mockCallbacks.onError,
      mockCallbacks.onComplete,
      mockCallbacks.onBranch,
      mockCallbacks.onStatus
    );

    expect(mockCallbacks.onStatus).toHaveBeenCalledWith('Processing files', 5);
  });

  it('should handle warning items', () => {
    const warningItem = {
      type: 'warning',
      message: 'Test warning',
      files_processed: 3
    };
    
    processJsonLine(
      JSON.stringify(warningItem),
      mockCallbacks.onFile,
      mockCallbacks.onError,
      mockCallbacks.onComplete,
      mockCallbacks.onBranch,
      mockCallbacks.onStatus
    );

    expect(mockCallbacks.onStatus).toHaveBeenCalledWith('Warning: Test warning', 3);
  });
});

describe('tryFixAndParseMultipleJsons', () => {
  it('should parse multiple JSON objects from a string', () => {
    const onJson = jest.fn();
    const input = '{"a": 1}{"b": 2}{"c": 3}';
    
    tryFixAndParseMultipleJsons(input, onJson);
    
    expect(onJson).toHaveBeenCalledTimes(3);
    expect(onJson).toHaveBeenNthCalledWith(1, '{"a": 1}');
    expect(onJson).toHaveBeenNthCalledWith(2, '{"b": 2}');
    expect(onJson).toHaveBeenNthCalledWith(3, '{"c": 3}');
  });

  it('should handle invalid JSON in the middle', () => {
    const onJson = jest.fn();
    const input = '{"a": 1}{invalid}{"b": 2}';
    
    tryFixAndParseMultipleJsons(input, onJson);
    
    expect(onJson).toHaveBeenCalledTimes(2);
    expect(onJson).toHaveBeenNthCalledWith(1, '{"a": 1}');
    expect(onJson).toHaveBeenNthCalledWith(2, '{"b": 2}');
  });

  it('should handle empty input', () => {
    const onJson = jest.fn();
    tryFixAndParseMultipleJsons('', onJson);
    expect(onJson).not.toHaveBeenCalled();
  });

  it('should handle input with no valid JSON', () => {
    const onJson = jest.fn();
    tryFixAndParseMultipleJsons('not json at all', onJson);
    expect(onJson).not.toHaveBeenCalled();
  });
}); 